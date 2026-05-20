import pandas as pd
from hijri_converter import Gregorian
from tqdm import tqdm


def generate_hijri_features(
    start_date: str,
    end_date: str,
    freq: str = "W-MON"
) -> pd.DataFrame:
    """
    Menghasilkan fitur kalender Hijriah mingguan.

    Output:
    - ds
    - is_ramadan
    - is_idul_fitri
    - is_idul_adha
    """

    daily_dates = pd.date_range(
        start=start_date,
        end=end_date,
        freq="D"
    )

    df_daily = pd.DataFrame({"ds": daily_dates})

    df_daily["is_ramadan"] = 0
    df_daily["is_idul_fitri"] = 0
    df_daily["is_idul_adha"] = 0

    for i, g_date in tqdm(
        enumerate(df_daily["ds"]),
        total=len(df_daily),
        desc="Generate Hijri Features",
        unit="day"
    ):
        h_date = Gregorian(
            g_date.year,
            g_date.month,
            g_date.day
        ).to_hijri()

        # Ramadan: bulan ke-9
        if h_date.month == 9:
            df_daily.at[i, "is_ramadan"] = 1

        # Idul Fitri: 1–2 Syawal
        if h_date.month == 10 and h_date.day in [1, 2]:
            df_daily.at[i, "is_idul_fitri"] = 1

        # Idul Adha: 10 Dzulhijjah
        if h_date.month == 12 and h_date.day == 10:
            df_daily.at[i, "is_idul_adha"] = 1

    df_weekly = (
        df_daily
        .set_index("ds")
        .resample(freq)
        .max()
        .reset_index()
    )

    return df_weekly
