# Narapangan

Web app prediksi harga cabai rawit merah Bandung untuk UMKM F&B. Pipeline mengambil
harga PIHPS, cuaca Garut dari NASA POWER, fitur kalender Hijriah, lalu menjalankan model
prediksi tersimpan untuk membuat prediksi empat minggu dan sinyal pengadaan.

## Struktur

```text
backend/
  api/                 HTTP API lokal untuk frontend
    server.py          entrypoint server HTTP
    gemini_client.py   integrasi Gemini (opsional)
  pipeline/            ingestion data, feature engineering, model inference
    pihps.py           scraping harga PIHPS
    nasa_weather.py    data cuaca NASA POWER
    hijri_features.py  fitur kalender Hijriah
    main_pipeline.py   orkestrasi pipeline + inferensi
  narapangan_saved_model/
    nbeatsx_best_model/    checkpoint model utama
    nhits_backup_model/    checkpoint cadangan
frontend/              React + Vite web app
  src/                 source UI utama
  index.html           entrypoint HTML
notebooks/             eksplorasi, modelling, dan laporan
scripts/dev.ps1        menjalankan API + frontend
requirements.txt       dependency Python
```

Folder `backend/script/` dipertahankan sebagai wrapper legacy agar import lama tetap aman.

## Menjalankan App (Lengkap)

### Prasyarat

- Windows 10/11
- Python 3.12 (sesuai `scripts/dev.ps1`)
- Node.js 18+ dan npm

### Setup Environment

1. Install dependency Python

```powershell
py -3.12 -m pip install -r requirements.txt
```

2. Install browser untuk Playwright

```powershell
py -3.12 -m playwright install chromium
```

3. Install dependency frontend

```powershell
npm install --prefix frontend
```

4. (Opsional) Konfigurasi Gemini

Buat file `.env` di root project berdasarkan `.env.example`:

```text
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Jika `.env` belum tersedia atau API gagal, aplikasi tetap berjalan dengan narasi fallback berbasis aturan.

### Menjalankan App

```powershell
.\scripts\dev.ps1
```

Jika PowerShell menolak script, jalankan dulu:

```powershell
Set-ExecutionPolicy -Scope Process RemoteSigned
```

Buka:

```text
http://127.0.0.1:5173
```

API lokal:

```text
POST http://127.0.0.1:8000/api/predict
GET  http://127.0.0.1:8000/api/health
```

Catatan:

- `scripts/dev.ps1` memakai Python 3.12 dari `C:\Program Files\Python312\python.exe` atau `py -3.12`.
- Jika kamu memakai virtual environment, jalankan backend manual atau edit `scripts/dev.ps1` agar menunjuk ke Python venv.
