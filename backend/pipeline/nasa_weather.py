from datetime import datetime
from io import StringIO
import re

import pandas as pd
import requests
from tqdm import tqdm


# ==========================================
# KONFIGURASI LOKASI GARUT
# ==========================================
GARUT_LATITUDE = -7.2458
GARUT_LONGITUDE = 107.9022

NASA_POWER_BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

WEATHER_PARAMETERS = [
    "PRECTOTCORR",  # Curah hujan terkoreksi, mm/day
    "T2M",          # Suhu udara pada 2 meter, °C
    "RH2M",         # Relative humidity pada 2 meter, %
]


# ==========================================
# HELPER
# ==========================================
def _validate_and_format_date(date_str: str) -> str:
    """
    Validasi format tanggal input 'YYYY-MM-DD'
    lalu ubah menjadi format NASA API 'YYYYMMDD'.
    """
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise ValueError(
            f"Format tanggal salah: '{date_str}'. "
            "Gunakan format 'YYYY-MM-DD', contoh '2026-02-18'."
        )

    return dt.strftime("%Y%m%d")


def _build_nasa_power_url(
    start_date: str,
    end_date: str,
    latitude: float = GARUT_LATITUDE,
    longitude: float = GARUT_LONGITUDE,
) -> str:
    """
    Bangun URL NASA POWER API untuk cuaca harian Garut.
    """
    start_api = _validate_and_format_date(start_date)
    end_api = _validate_and_format_date(end_date)

    params = ",".join(WEATHER_PARAMETERS)

    url = (
        f"{NASA_POWER_BASE_URL}"
        f"?parameters={params}"
        f"&community=AG"
        f"&longitude={longitude}"
        f"&latitude={latitude}"
        f"&start={start_api}"
        f"&end={end_api}"
        f"&format=CSV"
    )

    return url


def _fetch_nasa_csv(url: str) -> str:
    """
    Request raw CSV NASA POWER.
    """
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    return response.text


def _parse_nasa_csv_to_df(raw_text: str) -> pd.DataFrame:
    """
    Bersihkan response CSV NASA POWER dan ubah menjadi DataFrame.

    Output:
    - Tanggal
    - Garut_PRECTOTCORR
    - Garut_T2M
    - Garut_RH2M
    """

    # NASA CSV punya metadata sebelum "-END HEADER-"
    data_split = re.split(r"-END HEADER-\r?\n", raw_text)

    if len(data_split) < 2:
        raise ValueError(
            "Struktur response NASA POWER tidak dikenali. "
            "Penanda '-END HEADER-' tidak ditemukan."
        )

    clean_csv_data = data_split[1]
    df = pd.read_csv(StringIO(clean_csv_data))

    # Rapikan nama kolom
    df.columns = df.columns.str.strip()

    # Bentuk kolom tanggal dari YEAR + DOY
    if {"YEAR", "DOY"}.issubset(df.columns):
        df["Tanggal"] = pd.to_datetime(
            df["YEAR"].astype(str) + df["DOY"].astype(str).str.zfill(3),
            format="%Y%j"
        )

        df = df.drop(columns=["YEAR", "DOY"])

    elif {"YEAR", "MO", "DY"}.issubset(df.columns):
        # Fallback kalau response NASA formatnya YEAR-MO-DY
        df["Tanggal"] = pd.to_datetime(
            df[["YEAR", "MO", "DY"]].rename(
                columns={
                    "YEAR": "year",
                    "MO": "month",
                    "DY": "day",
                }
            )
        )

        df = df.drop(columns=["YEAR", "MO", "DY"])

    else:
        raise KeyError(
            f"Kolom tanggal dari NASA tidak sesuai. "
            f"Kolom tersedia: {list(df.columns)}"
        )

    # Drop metadata lokasi kalau muncul
    for col in ["LAT", "LON"]:
        if col in df.columns:
            df = df.drop(columns=[col])

    # Rename hanya untuk menambahkan prefix lokasi Garut,
    # tetap mempertahankan nama parameter NASA
    df = df.rename(columns={
        "PRECTOTCORR": "Garut_PRECTOTCORR",
        "T2M": "Garut_T2M",
        "RH2M": "Garut_RH2M",
    })

    # Ambil hanya kolom yang dipakai
    selected_cols = [
        "Tanggal",
        "Garut_PRECTOTCORR",
        "Garut_T2M",
        "Garut_RH2M",
    ]

    missing_cols = [col for col in selected_cols if col not in df.columns]
    if missing_cols:
        raise KeyError(f"Kolom hasil parsing belum lengkap: {missing_cols}")

    df = df[selected_cols]

    # Tipe data numerik
    numeric_cols = [
        "Garut_PRECTOTCORR",
        "Garut_T2M",
        "Garut_RH2M",
    ]

    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # NASA biasa pakai -999 sebagai missing value
    df[numeric_cols] = df[numeric_cols].replace(-999, pd.NA)

    # Rapikan urutan tanggal
    df = (
        df
        .sort_values("Tanggal")
        .reset_index(drop=True)
    )

    return df


# ==========================================
# FUNGSI UTAMA PIPELINE
# ==========================================
def get_nasa_weather_garut(
    start_date: str,
    end_date: str,
) -> pd.DataFrame:
    """
    Ambil data cuaca harian Garut dari NASA POWER
    sebagai fitur exogenous.

    Parameters
    ----------
    start_date : str
        Format 'YYYY-MM-DD'
        Contoh: '2026-02-18'

    end_date : str
        Format 'YYYY-MM-DD'
        Contoh: '2026-05-20'

    Returns
    -------
    pd.DataFrame
        Kolom:
        - tanggal
        - garut_precipitation
        - garut_temperature
        - garut_humidity
    """

    with tqdm(total=4, desc="Ingest NASA Weather Garut", unit="step") as pbar:
        # 1. Build URL
        url = _build_nasa_power_url(
            start_date=start_date,
            end_date=end_date,
        )
        pbar.set_postfix_str("URL dibentuk")
        pbar.update(1)

        # 2. Fetch API
        raw_text = _fetch_nasa_csv(url)
        pbar.set_postfix_str("Data API berhasil diambil")
        pbar.update(1)

        # 3. Parse ke DataFrame
        df = _parse_nasa_csv_to_df(raw_text)
        pbar.set_postfix_str("Data dibersihkan")
        pbar.update(1)

        # 4. Final return
        pbar.set_postfix_str("DataFrame selesai")
        pbar.update(1)

    return df
