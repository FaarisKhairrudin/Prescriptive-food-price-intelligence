import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta

try:
    from .pihps import get_pihps_cabai_rawit_bandung
    from .nasa_weather import get_nasa_weather_garut
    from .hijri_features import generate_hijri_features as _generate_hijri_features
except ImportError:
    from pihps import get_pihps_cabai_rawit_bandung
    from nasa_weather import get_nasa_weather_garut
    from hijri_features import generate_hijri_features as _generate_hijri_features
try:
    from backend.database import get_connection
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from backend.database import get_connection

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────
FREQ = "W-MON"
TARGET = "Harga"
UNIQUE_ID = "cabai_bandung"
HORIZON = 4
INPUT_SIZE = 17
MODEL_NAME = "NBEATSx"
PROJECT_BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_DIR = PROJECT_BACKEND_DIR / "narapangan_saved_model" / "nbeatsx_best_model"

LAG_MAP = {
    "Garut_T2M": 8,
    "Garut_RH2M": 13,
}

MAX_LAG_WEEKS = max(LAG_MAP.values())
FETCH_HISTORY_WEEKS = MAX_LAG_WEEKS + INPUT_SIZE + HORIZON + 2

EXOG_COLS = [
    "Garut_T2M_lag8w",
    "Garut_RH2M_lag13w",
    "is_ramadan",
    "is_idul_fitri",
    "is_idul_adha",
]

MODEL_INPUT_COLUMNS = ["unique_id", "ds", "y"] + EXOG_COLS
FUTURE_INPUT_COLUMNS = ["unique_id", "ds"] + EXOG_COLS
HIJRI_COLS = [
    "is_ramadan",
    "is_idul_fitri",
    "is_idul_adha",
]

SIGNAL_UP_THRESHOLD = 0.05
SIGNAL_DOWN_THRESHOLD = -0.05


# ─────────────────────────────────────────────────────────────────────────────
# INGESTION CACHING: DAILY & HIJRI DATASETS
# ─────────────────────────────────────────────────────────────────────────────
def generate_hijri_features(
    start_date: str,
    end_date: str,
    freq: str = "W-MON"
) -> pd.DataFrame:
    """
    Wrapper generate_hijri_features dengan file caching.
    """
    cache_dir = PROJECT_BACKEND_DIR / "data_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"hijri_{start_date}_{end_date}_{freq}.csv"

    if cache_file.exists():
        print(f"[CACHE] Memuat Hijri features dari cache: {cache_file.name}")
        df = pd.read_csv(cache_file)
        df["ds"] = pd.to_datetime(df["ds"])
        return df

    print(f"[Ingestion] Cache miss. Menghitung Hijri features...")
    df = _generate_hijri_features(start_date, end_date, freq)
    
    # Save to cache
    df.to_csv(cache_file, index=False)
    print(f"[CACHE] Berhasil menyimpan Hijri features ke cache: {cache_file.name}")
    return df


def _safe_float(val):
    try:
        if pd.isna(val):
            return None
        return float(val)
    except (TypeError, ValueError):
        return None


def build_daily_dataset(
    start_date: str,
    end_date: str,
    headless: bool = True
) -> pd.DataFrame:
    """
    Ambil dan gabungkan:
    - Harga Cabai Rawit Merah Kota Bandung dari PIHPS
    - Cuaca Garut dari NASA POWER
    Menggunakan SQLite database sebagai layer persistent cache.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Cek apakah data untuk end_date sudah pernah di-crawl hari ini
    cursor.execute("SELECT COUNT(*) FROM crawls WHERE run_date = ?", (end_date,))
    already_crawled = cursor.fetchone()[0] > 0
    conn.close()

    if already_crawled:
        print(f"[DATABASE] Cache hit: Memuat daily dataset dari SQLite ({start_date} s.d. {end_date})")
        conn = get_connection()
        query = """
            SELECT p.date AS Tanggal, p.price_per_kg AS Harga, prectotcorr AS Garut_PRECTOTCORR, t2m AS Garut_T2M, rh2m AS Garut_RH2M
            FROM (
                SELECT date, price_per_kg FROM prices
                WHERE commodity = 'Cabai Rawit Merah' AND market = 'Pasar Caringin'
                  AND date >= ? AND date <= ?
            ) p
            LEFT JOIN weather w ON p.date = w.date
            ORDER BY p.date ASC
        """
        df_daily = pd.read_sql_query(query, conn, params=(start_date, end_date))
        conn.close()

        if not df_daily.empty:
            df_daily["Tanggal"] = pd.to_datetime(df_daily["Tanggal"])
            return df_daily

    print(f"[DATABASE] Cache miss untuk {end_date}. Mengambil data dari PIHPS dan NASA Weather...")

    # 1. PIHPS Price Data
    df_price = get_pihps_cabai_rawit_bandung(
        start_date=start_date,
        end_date=end_date,
        headless=headless
    )

    # Simpan ke database
    conn = get_connection()
    for _, row in df_price.iterrows():
        dt_str = pd.to_datetime(row["tanggal"]).strftime("%Y-%m-%d")
        conn.execute("""
            INSERT OR REPLACE INTO prices (date, commodity, market, price_per_kg)
            VALUES (?, 'Cabai Rawit Merah', 'Pasar Caringin', ?)
        """, (dt_str, _safe_float(row["harga"])))
    conn.commit()
    conn.close()

    # 2. NASA Weather Garut
    df_weather = get_nasa_weather_garut(
        start_date=start_date,
        end_date=end_date
    )

    # Simpan ke database
    conn = get_connection()
    for _, row in df_weather.iterrows():
        dt_str = pd.to_datetime(row["Tanggal"]).strftime("%Y-%m-%d")
        conn.execute("""
            INSERT OR REPLACE INTO weather (date, prectotcorr, t2m, rh2m)
            VALUES (?, ?, ?, ?)
        """, (dt_str, _safe_float(row["Garut_PRECTOTCORR"]), _safe_float(row["Garut_T2M"]), _safe_float(row["Garut_RH2M"])))
    
    # Catat bahwa crawl untuk end_date telah dilakukan hari ini
    now_ts = int(datetime.now().timestamp())
    conn.execute("""
        INSERT OR REPLACE INTO crawls (run_date, timestamp)
        VALUES (?, ?)
    """, (end_date, now_ts))
    
    conn.commit()
    conn.close()

    # Load data yang sudah digabungkan dari database
    conn = get_connection()
    query = """
        SELECT p.date AS Tanggal, p.price_per_kg AS Harga, prectotcorr AS Garut_PRECTOTCORR, t2m AS Garut_T2M, rh2m AS Garut_RH2M
        FROM (
            SELECT date, price_per_kg FROM prices
            WHERE commodity = 'Cabai Rawit Merah' AND market = 'Pasar Caringin'
              AND date >= ? AND date <= ?
        ) p
        LEFT JOIN weather w ON p.date = w.date
        ORDER BY p.date ASC
    """
    df_daily = pd.read_sql_query(query, conn, params=(start_date, end_date))
    conn.close()
    
    df_daily["Tanggal"] = pd.to_datetime(df_daily["Tanggal"])
    print(f"[DATABASE] Daily dataset berhasil disimpan dan digabungkan di SQLite.")
    return df_daily


# ─────────────────────────────────────────────────────────────────────────────
# WEEKLY RESAMPLING & FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────────────────────
def _resample_daily_to_weekly(bandung_garut: pd.DataFrame) -> pd.DataFrame:
    bandung_garut = bandung_garut.copy()

    bandung_garut["Tanggal"] = pd.to_datetime(bandung_garut["Tanggal"])
    last_daily_date = bandung_garut["Tanggal"].max().normalize()

    numeric_cols = [
        TARGET,
        "Garut_PRECTOTCORR",
        "Garut_T2M",
        "Garut_RH2M",
    ]

    for col in numeric_cols:
        if col not in bandung_garut.columns:
            raise KeyError(
                f"Kolom '{col}' tidak ditemukan sebelum resampling. "
                f"Kolom tersedia: {list(bandung_garut.columns)}"
            )

        bandung_garut[col] = pd.to_numeric(
            bandung_garut[col],
            errors="coerce"
        )

    weekly = (
        bandung_garut
        .set_index("Tanggal")
        .resample(FREQ)
        .mean(numeric_only=True)
        .reset_index()
        .rename(columns={"Tanggal": "ds"})
    )

    # W-MON memberi label pada akhir minggu. Jika end_date jatuh di tengah
    # minggu, label minggu berikutnya belum lengkap dan tidak dipakai.
    weekly = (
        weekly[weekly["ds"] <= last_daily_date]
        .sort_values("ds")
        .reset_index(drop=True)
    )

    return weekly


def _merge_hijri_features(
    weekly: pd.DataFrame,
    hijri_weekly: pd.DataFrame
) -> pd.DataFrame:
    weekly = weekly.merge(
        hijri_weekly,
        on="ds",
        how="left"
    )

    weekly[HIJRI_COLS] = weekly[HIJRI_COLS].fillna(0).astype(int)

    return weekly


def _add_weather_lag_features(weekly: pd.DataFrame) -> pd.DataFrame:
    weekly = weekly.sort_values("ds").reset_index(drop=True)

    for col, lag in LAG_MAP.items():
        weekly[f"{col}_lag{lag}w"] = weekly[col].shift(lag)

    return weekly


def _build_weekly_feature_base(
    bandung_garut: pd.DataFrame,
    hijri_weekly: pd.DataFrame
) -> pd.DataFrame:
    weekly = _resample_daily_to_weekly(bandung_garut)
    weekly = _merge_hijri_features(weekly, hijri_weekly)
    return weekly


def preprocess_weekly(
    bandung_garut: pd.DataFrame,
    hijri_weekly: pd.DataFrame,
    output_start_date: str | None = None
) -> pd.DataFrame:
    """
    Ubah data harian menjadi dataset historis mingguan siap forecasting.
    """

    weekly = _build_weekly_feature_base(
        bandung_garut=bandung_garut,
        hijri_weekly=hijri_weekly
    )
    weekly = _add_weather_lag_features(weekly)

    weekly = weekly.dropna(subset=[TARGET] + EXOG_COLS).reset_index(drop=True)

    if output_start_date is not None:
        weekly = weekly[
            weekly["ds"] >= pd.to_datetime(output_start_date)
        ].reset_index(drop=True)

    weekly["unique_id"] = UNIQUE_ID
    weekly = weekly.rename(columns={TARGET: "y"})

    return weekly


def build_train_and_future_from_daily(
    bandung_garut: pd.DataFrame,
    hijri_weekly: pd.DataFrame,
    horizon: int = HORIZON
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Bentuk input NeuralForecast:
    - train_df: histori lengkap dengan y dan 5 fitur eksogen
    - futr_df : 4 minggu ke depan tanpa y, tetapi fitur eksogen wajib lengkap
    """

    weekly_base = _build_weekly_feature_base(
        bandung_garut=bandung_garut,
        hijri_weekly=hijri_weekly
    )

    weekly_train = _add_weather_lag_features(weekly_base.copy())
    train_df = (
        weekly_train
        .dropna(subset=[TARGET] + EXOG_COLS)
        .reset_index(drop=True)
    )

    if len(train_df) < INPUT_SIZE:
        raise ValueError(
            f"Data histori bersih hanya {len(train_df)} minggu. "
            f"Model membutuhkan minimal {INPUT_SIZE} minggu setelah lag feature."
        )

    last_train_ds = train_df["ds"].max()
    future_dates = pd.date_range(
        start=last_train_ds,
        periods=horizon + 1,
        freq=FREQ
    )[1:]

    hijri_weekly = hijri_weekly.copy()
    hijri_weekly["ds"] = pd.to_datetime(hijri_weekly["ds"])
    missing_hijri_dates = set(future_dates) - set(hijri_weekly["ds"])
    if missing_hijri_dates:
        future_hijri = generate_hijri_features(
            start_date=future_dates[0].strftime("%Y-%m-%d"),
            end_date=future_dates[-1].strftime("%Y-%m-%d"),
            freq=FREQ
        )
        hijri_weekly = (
            pd.concat([hijri_weekly, future_hijri], ignore_index=True)
            .drop_duplicates(subset="ds", keep="last")
        )

    future_base = pd.DataFrame({"ds": future_dates})
    future_base = _merge_hijri_features(future_base, hijri_weekly)

    combined = pd.concat(
        [weekly_base, future_base],
        ignore_index=True,
        sort=False
    )
    combined = _add_weather_lag_features(combined)
    combined["unique_id"] = UNIQUE_ID

    futr_df = combined[combined["ds"].isin(future_dates)].copy()
    if futr_df[EXOG_COLS].isna().any().any():
        missing_cols = futr_df[EXOG_COLS].columns[
            futr_df[EXOG_COLS].isna().any()
        ].tolist()
        raise ValueError(
            "Fitur eksogen future belum lengkap. "
            f"Kolom bermasalah: {missing_cols}"
        )

    train_df["unique_id"] = UNIQUE_ID
    train_df = train_df.rename(columns={TARGET: "y"})

    return (
        train_df[MODEL_INPUT_COLUMNS],
        futr_df[FUTURE_INPUT_COLUMNS].reset_index(drop=True)
    )

# ─────────────────────────────────────────────────────────────────────────────
# FULL PIPELINE
# ─────────────────────────────────────────────────────────────────────────────
def build_forecast_ready_dataset(
    start_date: str,
    end_date: str,
    headless: bool = True
) -> pd.DataFrame:
    """
    Pipeline final:
    - Otomatis ambil data lebih mundur untuk kebutuhan lag
    - Gabung PIHPS + NASA Weather
    - Tambahkan fitur Hijriah
    - Resample weekly
    - Hasil akhir siap forecast
    """

    # Ambil history ekstra untuk menghitung lag dan menjaga input_size model.
    start_ts = pd.to_datetime(start_date)
    fetch_start_ts = start_ts - timedelta(weeks=FETCH_HISTORY_WEEKS)
    fetch_start_date = fetch_start_ts.strftime("%Y-%m-%d")

    print(f"Target output  : {start_date} s.d. {end_date}")
    print(f"Fetch data dari: {fetch_start_date} s.d. {end_date}")
    print("History ekstra dipakai untuk kebutuhan lag dan input model.\n")

    # 1. Daily PIHPS + Weather
    df_daily = build_daily_dataset(
        start_date=fetch_start_date,
        end_date=end_date,
        headless=headless
    )

    # 2. Hijri weekly
    df_hijri_weekly = generate_hijri_features(
        start_date=fetch_start_date,
        end_date=end_date,
        freq=FREQ
    )

    # 3. Weekly forecast-ready dataset
    df_forecast = preprocess_weekly(
        bandung_garut=df_daily,
        hijri_weekly=df_hijri_weekly,
        output_start_date=start_date
    )

    return df_forecast


def build_prediction_input_datasets(
    end_date: str,
    headless: bool = True,
    history_weeks: int = FETCH_HISTORY_WEEKS
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Pipeline input inference model produksi NBEATSx.

    Returns
    -------
    train_df
        Kolom: unique_id, ds, y, dan EXOG_COLS.
    futr_df
        Kolom: unique_id, ds, dan EXOG_COLS untuk HORIZON minggu ke depan.
    """

    end_ts = pd.to_datetime(end_date)
    fetch_start_ts = end_ts - timedelta(weeks=history_weeks)
    fetch_start_date = fetch_start_ts.strftime("%Y-%m-%d")
    hijri_end_date = (end_ts + timedelta(weeks=HORIZON + 1)).strftime("%Y-%m-%d")

    print(f"Target inference sampai: {end_date}")
    print(f"Fetch data dari        : {fetch_start_date} s.d. {end_date}")
    print(f"Hijri features sampai  : {hijri_end_date}\n")

    df_daily = build_daily_dataset(
        start_date=fetch_start_date,
        end_date=end_date,
        headless=headless
    )

    df_hijri_weekly = generate_hijri_features(
        start_date=fetch_start_date,
        end_date=hijri_end_date,
        freq=FREQ
    )

    return build_train_and_future_from_daily(
        bandung_garut=df_daily,
        hijri_weekly=df_hijri_weekly,
        horizon=HORIZON
    )


def _ensure_neuralforecast_lightning_compatibility() -> None:
    """Ensure legacy NeuralForecast imports work with newer PyTorch Lightning layouts."""

    try:
        import logging
        import types
        import pytorch_lightning as pl

        if not hasattr(pl, "utilities"):
            pl.utilities = types.SimpleNamespace()
        if not hasattr(pl.utilities, "distributed"):
            pl.utilities.distributed = types.SimpleNamespace()
        if not hasattr(pl.utilities.distributed, "log"):
            class _NoopLog:
                @staticmethod
                def setLevel(level):
                    return

            pl.utilities.distributed.log = _NoopLog
    except Exception:
        pass


def load_saved_forecast_model(model_dir: str | Path = DEFAULT_MODEL_DIR):
    """
    Load model NeuralForecast yang sudah disimpan dari notebook modelling.
    Import dilakukan di dalam fungsi agar pipeline ingestion tetap ringan.
    """

    model_dir = Path(model_dir)
    if not model_dir.exists():
        raise FileNotFoundError(f"Folder model tidak ditemukan: {model_dir}")

    _ensure_neuralforecast_lightning_compatibility()

    from neuralforecast import NeuralForecast
    import torch
    from neuralforecast.losses.pytorch import MAE

    with torch.serialization.safe_globals([MAE]):
        nf_model = NeuralForecast.load(str(model_dir))
        
    # Hotfix for PyTorch Lightning >= 2.0.0
    import pytorch_lightning as pl
    import inspect
    valid_kwargs = set(inspect.signature(pl.Trainer.__init__).parameters.keys())
    
    for m in getattr(nf_model, "models", []):
        if hasattr(m, "trainer_kwargs"):
            m.trainer_kwargs = {k: v for k, v in m.trainer_kwargs.items() if k in valid_kwargs}
            # Force auto accelerator so it works on machines without GPU
            if "accelerator" in m.trainer_kwargs and not torch.cuda.is_available():
                m.trainer_kwargs["accelerator"] = "auto"
            
    return nf_model


def predict_future_prices(
    train_df: pd.DataFrame,
    futr_df: pd.DataFrame,
    model_dir: str | Path = DEFAULT_MODEL_DIR,
    model_name: str = MODEL_NAME
) -> pd.DataFrame:
    """
    Jalankan prediksi 4 minggu ke depan memakai model tersimpan.
    """

    nf_model = load_saved_forecast_model(model_dir)
    prediction_df = nf_model.predict(df=train_df, futr_df=futr_df)

    if model_name not in prediction_df.columns:
        candidate_cols = [
            col for col in prediction_df.columns
            if col not in {"unique_id", "ds"}
        ]
        if len(candidate_cols) != 1:
            raise KeyError(
                f"Kolom prediksi '{model_name}' tidak ditemukan. "
                f"Kolom tersedia: {list(prediction_df.columns)}"
            )
        model_name = candidate_cols[0]

    prediction_df = prediction_df.rename(
        columns={model_name: "predicted_price"}
    )
    prediction_df["predicted_price"] = (
        prediction_df["predicted_price"]
        .clip(lower=0)
        .astype(float)
    )
    prediction_df["predicted_price_rounded"] = (
        prediction_df["predicted_price"]
        .round(0)
        .astype(int)
    )

    # Save forecasts to DB
    try:
        conn = get_connection()
        forecast_date = pd.to_datetime(train_df["ds"].max()).strftime("%Y-%m-%d")
        for _, row in prediction_df.iterrows():
            target_date = pd.to_datetime(row["ds"]).strftime("%Y-%m-%d")
            conn.execute("""
                INSERT OR REPLACE INTO forecasts (forecast_date, target_date, predicted_price, model_version)
                VALUES (?, ?, ?, ?)
            """, (forecast_date, target_date, float(row["predicted_price"]), "NBEATSx"))
        conn.commit()
        conn.close()
        print(f"[DATABASE] Forecasts saved to SQLite for forecast_date={forecast_date}.")
    except Exception as e:
        print(f"[DATABASE] Error saving forecasts to SQLite: {e}")

    return prediction_df


def build_procurement_signal(
    train_df: pd.DataFrame,
    prediction_df: pd.DataFrame,
    model_name: str = MODEL_NAME
) -> dict:
    """
    Bentuk ringkasan sinyal pengadaan untuk dashboard UMKM.
    Logika mengikuti notebook: rata-rata prediksi 4 minggu vs harga terakhir.
    """

    train_sorted = train_df.sort_values("ds")
    pred_sorted = prediction_df.sort_values("ds")

    last_actual_date = train_sorted["ds"].iloc[-1]
    last_price = float(train_sorted["y"].iloc[-1])
    avg_pred = float(pred_sorted["predicted_price"].mean())
    min_pred = float(pred_sorted["predicted_price"].min())
    max_pred = float(pred_sorted["predicted_price"].max())
    pct_change = (avg_pred - last_price) / last_price

    if pct_change > SIGNAL_UP_THRESHOLD:
        signal_code = "stock_early"
        signal_label = "Pertimbangkan Stok Lebih Awal"
        signal_tone = "red"
        recommendation = (
            "Harga diproyeksikan naik. UMKM dapat mempertimbangkan stok "
            "lebih awal secara bertahap atau menimbang opsi mengunci harga "
            "dengan pemasok utama."
        )
    elif pct_change < SIGNAL_DOWN_THRESHOLD:
        signal_code = "hold_purchase"
        signal_label = "Pertimbangkan Tahan Pembelian"
        signal_tone = "green"
        recommendation = (
            "Harga diproyeksikan turun. UMKM dapat mempertimbangkan menunda "
            "pembelian besar jika stok operasional masih aman."
        )
    else:
        signal_code = "stable"
        signal_label = "Harga Relatif Stabil"
        signal_tone = "yellow"
        recommendation = (
            "Harga diproyeksikan relatif stabil. Pembelian normal dapat "
            "dipertimbangkan sambil tetap memantau perubahan harga mingguan."
        )

    return {
        "model_name": model_name,
        "horizon_weeks": len(pred_sorted),
        "last_actual_date": last_actual_date,
        "last_actual_price": round(last_price),
        "avg_predicted_price": round(avg_pred),
        "min_predicted_price": round(min_pred),
        "max_predicted_price": round(max_pred),
        "pct_change_avg": round(pct_change * 100, 2),
        "signal_code": signal_code,
        "signal_label": signal_label,
        "signal_tone": signal_tone,
        "recommendation": recommendation,
    }


def build_prediction_report(
    train_df: pd.DataFrame,
    futr_df: pd.DataFrame,
    prediction_df: pd.DataFrame
) -> dict:
    """
    Gabungkan histori, prediksi, fitur future, dan sinyal untuk konsumsi web.
    """

    summary = build_procurement_signal(train_df, prediction_df)
    last_price = float(summary["last_actual_price"])

    forecast_df = (
        prediction_df
        .merge(futr_df, on=["unique_id", "ds"], how="left")
        .sort_values("ds")
        .reset_index(drop=True)
    )
    forecast_df["week"] = range(1, len(forecast_df) + 1)
    forecast_df["change_from_last"] = (
        forecast_df["predicted_price"] - last_price
    )
    forecast_df["change_from_last_pct"] = (
        forecast_df["change_from_last"] / last_price * 100
    ).round(2)

    history_df = (
        train_df
        .sort_values("ds")
        .tail(52)
        .reset_index(drop=True)
        .rename(columns={"y": "actual_price"})
    )

    return {
        "summary": summary,
        "history_df": history_df,
        "forecast_df": forecast_df,
        "train_df": train_df,
        "futr_df": futr_df,
    }


def run_narapangan_pipeline(
    end_date: str | None = None,
    headless: bool = True,
    model_dir: str | Path = DEFAULT_MODEL_DIR
) -> dict:
    """
    One-call pipeline untuk web app:
    ambil data terbaru, siapkan input model, prediksi, lalu buat sinyal.
    """

    if end_date is None:
        end_date = pd.Timestamp.today().strftime("%Y-%m-%d")

    train_df, futr_df = build_prediction_input_datasets(
        end_date=end_date,
        headless=headless
    )
    prediction_df = predict_future_prices(
        train_df=train_df,
        futr_df=futr_df,
        model_dir=model_dir
    )

    return build_prediction_report(
        train_df=train_df,
        futr_df=futr_df,
        prediction_df=prediction_df
    )


def _dataframe_to_web_records(df: pd.DataFrame) -> list[dict]:
    web_df = df.copy()

    for col in web_df.columns:
        if pd.api.types.is_datetime64_any_dtype(web_df[col]):
            web_df[col] = web_df[col].dt.strftime("%Y-%m-%d")

    return web_df.to_dict(orient="records")


def build_web_payload(pipeline_result: dict) -> dict:
    """
    Ubah output run_narapangan_pipeline menjadi dict JSON-friendly.
    Cocok untuk Streamlit, FastAPI, atau frontend lain.
    """

    summary = pipeline_result["summary"].copy()
    last_actual_date = summary.get("last_actual_date")
    if hasattr(last_actual_date, "strftime"):
        summary["last_actual_date"] = last_actual_date.strftime("%Y-%m-%d")

    return {
        "summary": summary,
        "history": _dataframe_to_web_records(pipeline_result["history_df"]),
        "forecast": _dataframe_to_web_records(pipeline_result["forecast_df"]),
    }


# ─────────────────────────────────────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    result = run_narapangan_pipeline(
        end_date="2026-05-20",
        headless=True
    )

    print("\n=== PROCUREMENT SIGNAL ===")
    for key, value in result["summary"].items():
        print(f"{key}: {value}")

    print("\n=== HISTORY DF ===")
    print(result["history_df"].tail())
    print(result["history_df"].shape)

    print("\n=== FORECAST DF ===")
    print(result["forecast_df"])
    print(result["forecast_df"].shape)
