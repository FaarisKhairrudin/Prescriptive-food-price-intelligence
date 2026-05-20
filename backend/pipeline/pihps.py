from pathlib import Path
from tempfile import TemporaryDirectory
from datetime import datetime
import re
from tqdm import tqdm

import pandas as pd
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


def _normalize_date_for_ui(date_str: str) -> str:
    """
    Input:  '2026-02-18'
    Output: '18/2/2026'
    """
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{dt.day}/{dt.month}/{dt.year}"


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


def get_pihps_cabai_rawit_bandung(
    start_date: str,
    end_date: str,
    headless: bool = True
) -> pd.DataFrame:
    """
    Ambil data harian Cabai Rawit Merah Kota Bandung dari PIHPS.

    Parameters
    ----------
    start_date : str
        Format 'YYYY-MM-DD', contoh '2026-02-18'
    end_date : str
        Format 'YYYY-MM-DD', contoh '2026-05-20'
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

    with tqdm(total=9, desc="Scraping PIHPS", unit="step") as pbar:
        with TemporaryDirectory() as temp_dir:
            temp_dir = Path(temp_dir)

            with sync_playwright() as p:
                browser = p.chromium.launch(headless=headless)
                page = browser.new_page()

                try:
                    # 1. Buka halaman
                    page.goto(PIHPS_URL, wait_until="networkidle")
                    page.wait_for_timeout(5000)
                    pbar.set_postfix_str("Halaman dimuat")
                    pbar.update(1)

                    # 2. Pilih komoditas
                    _click_checkbox_by_text(page, "Cabai Rawit Merah")
                    page.wait_for_timeout(1200)
                    pbar.set_postfix_str("Komoditas dipilih")
                    pbar.update(1)

                    # 3. Pilih provinsi
                    _click_checkbox_by_text(page, "Jawa Barat")
                    page.wait_for_timeout(2500)
                    pbar.set_postfix_str("Provinsi dipilih")
                    pbar.update(1)

                    # 4. Pilih kota
                    page.get_by_text("Kota Bandung", exact=True).wait_for(timeout=15000)
                    _click_checkbox_by_text(page, "Kota Bandung")
                    page.wait_for_timeout(1200)
                    pbar.set_postfix_str("Kota dipilih")
                    pbar.update(1)

                    # 5. Isi tanggal
                    _fill_date_input(page, "Tanggal Mulai", start_date_ui)
                    _fill_date_input(page, "Tanggal Selesai", end_date_ui)
                    page.wait_for_timeout(1200)
                    pbar.set_postfix_str("Tanggal diisi")
                    pbar.update(1)

                    # 6. Klik lihat laporan
                    page.get_by_text("Lihat Laporan", exact=False).click()
                    pbar.set_postfix_str("Memuat laporan")
                    pbar.update(1)

                    # 7. Tunggu tabel hasil muncul
                    page.get_by_text("Cabai Rawit Merah", exact=False).last.wait_for(timeout=30000)
                    page.wait_for_timeout(4000)
                    pbar.set_postfix_str("Laporan muncul")
                    pbar.update(1)

                    # 8. Download file laporan
                    with page.expect_download(timeout=30000) as download_info:
                        page.locator("#btnDownload").click()

                    download = download_info.value
                    downloaded_file = temp_dir / download.suggested_filename
                    download.save_as(downloaded_file)

                    pbar.set_postfix_str("File diunduh")
                    pbar.update(1)

                finally:
                    browser.close()

            # 9. Parse excel ke dataframe
            df = _parse_downloaded_excel_to_daily_df(
                downloaded_file,
                komoditas="Cabai Rawit Merah"
            )

            pbar.set_postfix_str("DataFrame selesai")
            pbar.update(1)

    return df
