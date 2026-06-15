from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory
import argparse
import re
from tqdm import tqdm

import pandas as pd
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


PIHPS_URL = "https://www.bi.go.id/hargapangan/TabelHarga/PasarTradisionalDaerah"


def _click_checkbox_by_text(page, text: str):
    """
    Klik checkbox pada row berdasarkan teks.
    Contoh: 'Cabai Rawit Merah', 'Jawa Barat', 'Kota Bandung'
    """
    row = page.locator("tr").filter(has_text=text).first

    if row.count() == 0:
        raise ValueError(f"Item '{text}' tidak ditemukan di halaman.")

    checkbox = row.locator("[role='checkbox']").first

    if checkbox.count() == 0:
        raise ValueError(f"Checkbox untuk '{text}' tidak ditemukan.")

    checkbox.click()


def _fill_date_input(page, label: str, value: str):
    """
    Isi input tanggal berdasarkan label.
    value harus format d/m/YYYY, contoh: '18/2/2026'
    """
    date_input = page.locator(
        f"xpath=//*[normalize-space()='{label}']/following::input[@type='text'][1]"
    )

    if date_input.count() == 0:
        raise ValueError(f"Input tanggal '{label}' tidak ditemukan.")

    date_input.fill(value)

    datebox_id_by_label = {
        "Tanggal Mulai": "dboDateMulai",
        "Tanggal Selesai": "dboDateSelesai",
    }
    datebox_id = datebox_id_by_label.get(label)

    if datebox_id:
        dt = datetime.strptime(value, "%d/%m/%Y")
        page.evaluate(
            """({ dateboxId, isoDate }) => {
                const instance = window.$ && window.$(`#${dateboxId}`).dxDateBox("instance");
                if (instance) {
                    instance.option("value", isoDate);
                }
            }""",
            {
                "dateboxId": datebox_id,
                "isoDate": dt.strftime("%Y-%m-%d"),
            }
        )


def _normalize_date_for_ui(date_str: str) -> str:
    """
    Input:  '2026-02-18'
    Output: '18/2/2026'
    """
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{dt.day}/{dt.month}/{dt.year}"


def _set_price_type(page, price_type_id: int):
    page.evaluate(
        """(priceTypeId) => {
            const instance = window.$ && window.$("#cboPriceType").dxSelectBox("instance");
            if (instance) {
                instance.option("value", priceTypeId);
            }
        }""",
        price_type_id
    )


def _clean_price(value):
    """
    Ubah harga seperti '97,000' atau '97.000' menjadi 97000.
    """
    if pd.isna(value):
        return None

    text = str(value).strip()

    if text in {"", "-", "nan", "None"}:
        return None

    digits = re.sub(r"[^\d]", "", text)

    return int(digits) if digits else None


def _parse_downloaded_excel_to_daily_df(
    file_path: str | Path,
    komoditas: str = "Cabai Rawit Merah"
) -> pd.DataFrame:
    """
    Parse file Excel hasil Download PIHPS menjadi:
    tanggal | harga
    """

    raw = pd.read_excel(file_path, header=None)

    # Cari row yang memuat nama komoditas
    target_row_idx = None
    for i in range(len(raw)):
        row_text = " | ".join(raw.iloc[i].astype(str).tolist())
        if komoditas.lower() in row_text.lower():
            target_row_idx = i
            break

    if target_row_idx is None:
        raise ValueError(
            f"Baris komoditas '{komoditas}' tidak ditemukan di file download."
        )

    # Cari row header tanggal di atas baris komoditas.
    # Kita pilih row yang punya tanggal terbanyak.
    best_header_idx = None
    best_date_count = 0
    parsed_dates_by_col = {}

    for i in range(target_row_idx):
        date_map = {}

        for col in range(raw.shape[1]):
            cell = raw.iloc[i, col]

            if pd.isna(cell):
                continue

            # Coba parse tanggal fleksibel
            parsed = pd.to_datetime(cell, dayfirst=True, errors="coerce")

            if not pd.isna(parsed):
                date_map[col] = parsed.date()

        if len(date_map) > best_date_count:
            best_date_count = len(date_map)
            best_header_idx = i
            parsed_dates_by_col = date_map

    if best_header_idx is None or best_date_count == 0:
        raise ValueError("Header tanggal tidak berhasil ditemukan di file download.")

    # Ambil harga dari row komoditas pada kolom-kolom tanggal
    records = []

    for col, tanggal in parsed_dates_by_col.items():
        harga_raw = raw.iloc[target_row_idx, col]
        harga = _clean_price(harga_raw)

        if harga is not None:
            records.append({
                "tanggal": pd.to_datetime(tanggal),
                "harga": harga
            })

    df = pd.DataFrame(records)

    if df.empty:
        raise ValueError("Data harga kosong setelah parsing file download.")

    df = (
        df
        .drop_duplicates(subset="tanggal")
        .sort_values("tanggal")
        .reset_index(drop=True)
    )

    return df


def _parse_grid_payload_to_daily_df(
    payload: dict,
    komoditas: str = "Cabai Rawit Merah"
) -> pd.DataFrame:
    """
    Parse data DevExtreme grid PIHPS menjadi:
    tanggal | harga
    """
    items = payload.get("items", [])

    target_item = None
    for item in items:
        name = str(item.get("name", ""))
        if komoditas.lower() in name.lower():
            target_item = item
            break

    if target_item is None:
        raise ValueError(f"Data komoditas '{komoditas}' tidak ditemukan di grid PIHPS.")

    records = []
    for key, value in target_item.items():
        parsed_date = pd.to_datetime(key, dayfirst=True, errors="coerce")
        if pd.isna(parsed_date):
            continue

        harga = _clean_price(value)
        if harga is not None:
            records.append({
                "tanggal": parsed_date.normalize(),
                "harga": harga
            })

    df = pd.DataFrame(records)

    if df.empty:
        raise ValueError("Data harga kosong setelah parsing grid PIHPS.")

    return (
        df
        .drop_duplicates(subset="tanggal")
        .sort_values("tanggal")
        .reset_index(drop=True)
    )


def get_pihps_harga_bandung(
    start_date: str,
    end_date: str,
    komoditas: str = "Cabai Rawit Merah",
    provinsi: str = "Jawa Barat",
    kota: str = "Kota Bandung",
    price_type_id: int = 1,
    fill_daily: bool = False,
    headless: bool = True
) -> pd.DataFrame:
    """
    Ambil data harian komoditas Kota Bandung dari PIHPS.

    Parameters
    ----------
    start_date : str
        Format 'YYYY-MM-DD', contoh '2026-02-18'
    end_date : str
        Format 'YYYY-MM-DD', contoh '2026-05-20'
    komoditas : str
        Nama komoditas sesuai label PIHPS, contoh 'Cabai Rawit Merah',
        'Bawang Merah', atau 'Bawang Putih'.
    provinsi : str
        Nama provinsi sesuai label PIHPS.
    kota : str
        Nama kota/kabupaten sesuai label PIHPS.
    price_type_id : int
        1=Pasar Tradisional, 2=Pasar Modern, 3=Pedagang Besar, 4=Produsen.
    fill_daily : bool
        Jika True, tanggal dibuat kontinu harian dan harga di-forward-fill
        seperti proses cleaning notebook lama.
    headless : bool
        True  -> browser tidak terlihat
        False -> browser terlihat untuk debugging

    Returns
    -------
    pd.DataFrame
        Kolom:
        - tanggal
        - harga
    """

    start_date_ui = _normalize_date_for_ui(start_date)
    end_date_ui = _normalize_date_for_ui(end_date)

    with tqdm(total=9, desc=f"Scraping PIHPS {komoditas}", unit="step") as pbar:
        with TemporaryDirectory() as temp_dir:
            temp_dir = Path(temp_dir)

            with sync_playwright() as p:
                browser = p.chromium.launch(headless=headless)
                context = browser.new_context(accept_downloads=True)
                page = context.new_page()
                page.set_default_timeout(60000)
                page.set_default_navigation_timeout(90000)

                try:
                    # 1. Buka halaman
                    page.goto(PIHPS_URL, wait_until="domcontentloaded", timeout=90000)
                    try:
                        page.wait_for_load_state("networkidle", timeout=15000)
                    except PlaywrightTimeoutError:
                        # Halaman BI sering tetap membuka request background.
                        # Yang penting DOM utama sudah siap untuk interaksi.
                        pass
                    page.wait_for_selector("body", timeout=30000)
                    page.wait_for_timeout(3000)
                    pbar.set_postfix_str("Halaman dimuat")
                    pbar.update(1)

                    _set_price_type(page, price_type_id)
                    page.wait_for_timeout(2500)

                    # 2. Pilih komoditas
                    _click_checkbox_by_text(page, komoditas)
                    page.wait_for_timeout(1200)
                    pbar.set_postfix_str("Komoditas dipilih")
                    pbar.update(1)

                    # 3. Pilih provinsi
                    _click_checkbox_by_text(page, provinsi)
                    page.wait_for_timeout(2500)
                    pbar.set_postfix_str("Provinsi dipilih")
                    pbar.update(1)

                    # 4. Pilih kota
                    page.get_by_text(kota, exact=True).wait_for(timeout=15000)
                    _click_checkbox_by_text(page, kota)
                    page.wait_for_timeout(1200)
                    pbar.set_postfix_str("Kota dipilih")
                    pbar.update(1)

                    # 5. Isi tanggal
                    _fill_date_input(page, "Tanggal Mulai", start_date_ui)
                    _fill_date_input(page, "Tanggal Selesai", end_date_ui)
                    page.wait_for_timeout(1200)
                    pbar.set_postfix_str("Tanggal diisi")
                    pbar.update(1)

                    # 6. Muat laporan
                    grid_payload = page.evaluate(
                        """() => new Promise((resolve, reject) => {
                            try {
                                $("#gridDiv").hide();
                                $("#chartDiv").hide();
                                $("#loadingDiv").show();
                                $("#btnReport").hide();
                                $("#btnDownload").hide();
                                window.datemulai = "";
                                window.dateselesai = "";
                                window.once = true;

                                const grid = $("#grid1").dxDataGrid("instance");
                                grid.getDataSource().reload()
                                    .done(() => {
                                        resolve({
                                            columns: grid.getVisibleColumns().map((column) => ({
                                                dataField: column.dataField,
                                                name: column.name,
                                                caption: column.caption,
                                            })),
                                            items: grid.getDataSource().items(),
                                        });
                                    })
                                    .fail((error) => reject(String(error)));
                            } catch (error) {
                                reject(String(error));
                            }
                        })"""
                    )
                    pbar.set_postfix_str("Memuat laporan")
                    pbar.update(1)

                    # 7. Tunggu laporan siap diunduh. Grid PIHPS kadang
                    # menyimpan teks komoditas sebagai node hidden/virtualized.
                    pbar.set_postfix_str("Laporan muncul")
                    pbar.update(1)

                    # 8. Data grid sudah diambil dari browser.
                    pbar.set_postfix_str("Data grid diambil")
                    pbar.update(1)

                finally:
                    context.close()
                    browser.close()

            # 9. Parse grid ke dataframe
            df = _parse_grid_payload_to_daily_df(
                grid_payload,
                komoditas=komoditas
            )

            if fill_daily:
                df = (
                    df
                    .set_index("tanggal")
                    .reindex(pd.date_range(df["tanggal"].min(), df["tanggal"].max(), freq="D"))
                    .ffill()
                    .rename_axis("tanggal")
                    .reset_index()
                )
                df["harga"] = df["harga"].astype(int)

            pbar.set_postfix_str("DataFrame selesai")
            pbar.update(1)

    return df


def get_pihps_cabai_rawit_bandung(
    start_date: str,
    end_date: str,
    headless: bool = True
) -> pd.DataFrame:
    """
    Backward-compatible wrapper untuk pipeline lama.
    """
    return get_pihps_harga_bandung(
        start_date=start_date,
        end_date=end_date,
        komoditas="Cabai Rawit Merah",
        headless=headless
    )


def scrape_commodities_to_csv(
    commodities: list[str],
    start_date: str,
    end_date: str,
    output_dir: str | Path,
    price_type_id: int = 1,
    fill_daily: bool = False,
    headless: bool = True
) -> list[Path]:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    saved_files = []

    for commodity in commodities:
        df = get_pihps_harga_bandung(
            start_date=start_date,
            end_date=end_date,
            komoditas=commodity,
            price_type_id=price_type_id,
            fill_daily=fill_daily,
            headless=headless
        )
        df.insert(0, "komoditas", commodity)
        safe_name = re.sub(r"[^a-z0-9]+", "_", commodity.lower()).strip("_")
        output_path = output_dir / f"pihps_{safe_name}_{start_date}_{end_date}.csv"
        df.to_csv(output_path, index=False)
        saved_files.append(output_path)
        print(f"[PIHPS] Saved {commodity}: {output_path}")

    return saved_files


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Scrape data harga PIHPS Kota Bandung untuk kebutuhan modelling."
    )
    parser.add_argument("--start-date", default="2022-01-01")
    parser.add_argument("--end-date", default="2026-05-01")
    parser.add_argument(
        "--commodity",
        action="append",
        dest="commodities",
        default=None,
        help="Nama komoditas PIHPS. Bisa dipakai berkali-kali."
    )
    parser.add_argument("--output-dir", default="backend/data_cache/modelling")
    parser.add_argument(
        "--price-type-id",
        type=int,
        default=1,
        help="1=Pasar Tradisional, 2=Pasar Modern, 3=Pedagang Besar, 4=Produsen."
    )
    parser.add_argument("--fill-daily", action="store_true")
    parser.add_argument("--headed", action="store_true")
    args = parser.parse_args()

    commodities = args.commodities or [
        "Cabai Rawit Merah",
        "Bawang Merah",
        "Bawang Putih",
    ]

    scrape_commodities_to_csv(
        commodities=commodities,
        start_date=args.start_date,
        end_date=args.end_date,
        output_dir=args.output_dir,
        price_type_id=args.price_type_id,
        fill_daily=args.fill_daily,
        headless=not args.headed
    )
