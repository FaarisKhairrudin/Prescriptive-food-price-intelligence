from __future__ import annotations

import json
import re
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from backend.api.gemini_client import (
    GeminiQuotaError,
    generate_gemini_json,
    generate_gemini_text,
    is_gemini_configured,
)
from backend.pipeline.main_pipeline import (
    build_web_payload,
    run_narapangan_pipeline,
    load_payload_from_cache,
    save_payload_to_cache,
    reconstruct_web_payload_from_db
)
from backend.database import get_connection
from backend.api.auth import verify_password, create_token, verify_token


PIPELINE_LOCK = threading.Lock()
IS_PIPELINE_RUNNING = False

HOST = "127.0.0.1"
PORT = 8000
NARAPANGAN_SYSTEM_PROMPT = """
Kamu adalah AI Narapangan, analis pengadaan cabai untuk UMKM F&B Bandung.
Jawab hanya topik prediksi harga cabai, strategi stok/pembelian, UMKM makanan,
cuaca Garut, kalender Hijriah, dan hasil forecast Narapangan. Jika user bertanya
di luar domain seperti coding, matematika umum, PR, esai, hiburan, atau topik
lain, tolak singkat dan arahkan kembali ke konsultasi stok cabai.

Gunakan bahasa Indonesia yang natural, praktis, dan ramah untuk user non-teknis.
Jangan menyebut nama arsitektur model teknis; sebut "AI Narapangan" atau
"model prediksi harga". Jangan mengklaim kepastian. Gunakan hanya data konteks
yang diberikan dan jangan mengarang harga. Hindari instruksi mutlak seperti
"harus beli", "wajib", atau "beli sekarang"; gunakan bahasa pertimbangan yang
tetap tegas, misalnya "opsi yang masuk akal", "bisa dipertimbangkan", atau
"lebih aman dilakukan bertahap". Jangan mengulang disclaimer generik.
"""
OUT_OF_SCOPE_KEYWORDS = {
    "coding",
    "koding",
    "python",
    "javascript",
    "java",
    "html",
    "css",
    "sql",
    "algoritma",
    "integral",
    "turunan",
    "limit fungsi",
    "matematika",
    "pr ",
    "pekerjaan rumah",
    "essay",
    "esai",
    "terjemahkan",
    "translate",
    "puisi",
}
IN_SCOPE_KEYWORDS = {
    "cabai",
    "cabe",
    "harga",
    "stok",
    "umkm",
    "usaha",
    "prediksi",
    "belanja",
    "beli",
    "pemasok",
    "menu",
    "modal",
    "kg",
    "kilogram",
    "seblak",
    "geprek",
    "sambal",
    "warung",
}


def _json_default(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _format_rupiah(value: float | int) -> str:
    return f"Rp {int(round(value)):,.0f}".replace(",", ".")


def _format_number(value) -> str:
    try:
        return f"{float(value):.2f}"
    except (TypeError, ValueError):
        return "-"


def _is_obviously_out_of_scope(question: str) -> bool:
    text = f" {question.lower()} "
    has_out_scope_word = any(keyword in text for keyword in OUT_OF_SCOPE_KEYWORDS)
    has_in_scope_word = any(keyword in text for keyword in IN_SCOPE_KEYWORDS)
    return has_out_scope_word and not has_in_scope_word


def _clean_business_profile(profile: dict | None) -> dict:
    if not isinstance(profile, dict):
        return {}

    allowed_keys = {
        "business_type",
        "daily_usage_kg",
        "stock_days",
        "storage_capacity_kg",
        "buying_style",
        "can_adjust_price",
    }
    return {
        key: str(value).strip()
        for key, value in profile.items()
        if key in allowed_keys and str(value).strip()
    }


def _clean_chat_history(history) -> list[dict[str, str]]:
    if not isinstance(history, list):
        return []

    cleaned = []
    for item in history[-8:]:
        if not isinstance(item, dict):
            continue

        role = str(item.get("role") or "").strip().lower()
        text = str(item.get("text") or "").strip()
        if role not in {"user", "assistant"} or not text:
            continue

        cleaned.append({
            "role": role,
            "text": text[:900],
        })

    return cleaned


def _chat_history_context(history: list[dict[str, str]]) -> str:
    if not history:
        return "Riwayat percakapan sesi ini: belum ada."

    lines = []
    for item in history:
        speaker = "User" if item["role"] == "user" else "AI Narapangan"
        lines.append(f"- {speaker}: {item['text']}")

    return "Riwayat percakapan sesi ini:\n" + "\n".join(lines)


def _business_profile_sentence(profile: dict) -> str:
    if not profile:
        return "Profil UMKM belum diisi, jadi pertimbangan dibuat secara umum."

    parts = []
    if profile.get("business_type"):
        parts.append(f"jenis usaha {profile['business_type']}")
    if profile.get("daily_usage_kg"):
        parts.append(f"pemakaian cabai sekitar {profile['daily_usage_kg']} kg/hari")
    if profile.get("stock_days"):
        parts.append(f"stok saat ini cukup untuk {profile['stock_days']} hari")
    if profile.get("storage_capacity_kg"):
        parts.append(f"kapasitas simpan sekitar {profile['storage_capacity_kg']} kg")
    if profile.get("buying_style"):
        parts.append(f"gaya belanja {profile['buying_style']}")
    if profile.get("can_adjust_price"):
        parts.append(f"fleksibilitas harga menu: {profile['can_adjust_price']}")

    return "Kondisi UMKM saat ini " + ", ".join(parts) + "."


def _strip_redundant_disclaimer(text: str) -> str:
    forbidden_phrases = (
        "perlu diingat",
        "hanya prediksi",
        "hasil prediksi untuk bahan pertimbangan",
        "bukan kepastian pasar",
        "bukan merupakan kepastian",
        "tidak menjamin",
    )
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    kept = [
        sentence
        for sentence in sentences
        if sentence
        and not any(phrase in sentence.lower() for phrase in forbidden_phrases)
    ]
    return " ".join(kept).strip() or text.strip()


def _clean_chat_reply(text: str) -> str:
    clean = str(text or "").strip()
    clean = re.sub(r"^\s{0,3}#{1,6}\s*", "", clean, flags=re.MULTILINE)
    clean = re.sub(r"^\s*[-*]\s+", "- ", clean, flags=re.MULTILINE)
    clean = re.sub(r"\n{3,}", "\n\n", clean)
    return clean


def build_rule_based_explanation(payload: dict, business_profile: dict | None = None) -> dict:
    summary = payload["summary"]
    forecast = payload["forecast"]
    business_profile = _clean_business_profile(business_profile)

    first_forecast = forecast[0]
    peak_week = max(forecast, key=lambda row: row["predicted_price"])
    low_week = min(forecast, key=lambda row: row["predicted_price"])

    active_hijri = []
    for row in forecast:
        if row.get("is_ramadan"):
            active_hijri.append(f"Ramadan pada minggu {row['week']}")
        if row.get("is_idul_fitri"):
            active_hijri.append(f"Idul Fitri pada minggu {row['week']}")
        if row.get("is_idul_adha"):
            active_hijri.append(f"Idul Adha pada minggu {row['week']}")

    if summary["signal_code"] == "stock_early":
        posture = (
            f"Kenaikan mulai terasa menjelang {peak_week['ds']}, jadi "
            "boleh dipertimbangkan menambah sebagian stok lebih awal dan "
            "prioritaskan menu yang paling bergantung pada cabai."
        )
    elif summary["signal_code"] == "hold_purchase":
        posture = (
            f"Karena ada peluang harga lebih rendah di sekitar {low_week['ds']}, "
            "pembelian besar bisa dipertimbangkan ditahan dulu sambil belanja bertahap."
        )
    else:
        posture = (
            f"Pergerakan cenderung stabil, jadi pola belanja normal masih masuk akal, "
            f"dengan pantauan lebih dekat menjelang {peak_week['ds']}."
        )

    hijri_note = f"Ada {', '.join(active_hijri)} yang bisa memberi tekanan harga. " if active_hijri else ""
    narrative = (
        f"Minggu depan diperkirakan sekitar {_format_rupiah(first_forecast['predicted_price'])}/kg "
        f"dengan rata-rata 4 minggu di {_format_rupiah(summary['avg_predicted_price'])}/kg "
        f"atau {summary['pct_change_avg']:+.2f}% dari harga terakhir "
        f"{_format_rupiah(summary['last_actual_price'])}/kg. "
        f"Puncak ada di {peak_week['ds']} sekitar {_format_rupiah(peak_week['predicted_price'])}/kg "
        f"dan titik rendah di {low_week['ds']} sekitar {_format_rupiah(low_week['predicted_price'])}/kg. "
        f"{hijri_note}"
        f"{_business_profile_sentence(business_profile)} "
        f"Sinyal utamanya {summary['signal_label']}. {posture}"
    )

    return {
        "title": "Analisis AI Narapangan",
        "headline": f"AI Narapangan melihat: {summary['signal_label']}",
        "body": narrative,
        "offer": (
            "Punya skenario stok atau modal tertentu? Lanjutkan di konsultasi "
            "AI untuk menimbang strategi pembelian."
        ),
        "drivers": [
            "Harga historis cabai rawit merah Bandung",
            "Suhu Garut lag 8 minggu",
            "Kelembaban Garut lag 13 minggu",
            "Kalender Ramadan, Idul Fitri, dan Idul Adha",
        ],
        "source": "rule_based",
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


def _forecast_context_for_prompt(payload: dict, business_profile: dict | None = None) -> str:
    summary = payload["summary"]
    forecast_lines = []
    for row in payload["forecast"]:
        calendar_bits = []
        if row.get("is_ramadan"):
            calendar_bits.append("Ramadan")
        if row.get("is_idul_fitri"):
            calendar_bits.append("Idul Fitri")
        if row.get("is_idul_adha"):
            calendar_bits.append("Idul Adha")
        calendar = ", ".join(calendar_bits) if calendar_bits else "normal"
        forecast_lines.append(
            f"- Minggu {row['week']} ({row['ds']}): prediksi "
            f"{_format_rupiah(row['predicted_price'])}/kg, perubahan "
            f"{row['change_from_last_pct']:+.2f}%, kalender {calendar}, "
            f"suhu Garut lag 8 minggu {_format_number(row.get('Garut_T2M_lag8w'))} C, "
            f"kelembaban Garut lag 13 minggu {_format_number(row.get('Garut_RH2M_lag13w'))}%"
        )

    return "\n".join(
        [
            "Ringkasan prediksi:",
            f"- Harga terakhir: {_format_rupiah(summary['last_actual_price'])}/kg pada {summary['last_actual_date']}",
            f"- Rata-rata prediksi 4 minggu: {_format_rupiah(summary['avg_predicted_price'])}/kg",
            f"- Perubahan rata-rata: {summary['pct_change_avg']:+.2f}%",
            f"- Sinyal sistem: {summary['signal_label']}",
            f"- Pertimbangan awal sistem: {summary['recommendation']}",
            "",
            "Rincian 4 minggu ke depan:",
            "\n".join(forecast_lines),
            "",
            _business_profile_sentence(_clean_business_profile(business_profile)),
        ]
    )


def build_llm_explanation(payload: dict, business_profile: dict | None = None) -> dict:
    fallback = build_rule_based_explanation(payload, business_profile)
    if not is_gemini_configured():
        return fallback

    prompt = _forecast_context_for_prompt(payload, business_profile) + """

Buat insight analitik untuk kartu "Analisis AI Narapangan".
Kembalikan JSON valid saja tanpa markdown dengan schema:
{
  "headline": "judul insight maksimal 12 kata, spesifik terhadap arah harga",
  "body": "3 kalimat maksimal 90 kata. Kalimat 1 membaca arah harga dan menyebut harga saat ini, harga minggu depan, serta rata-rata 4 minggu. Kalimat 2 membaca pola mingguan, sebut minggu puncak atau minggu yang mulai melandai, dan kaitkan singkat dengan profil UMKM bila ada. Kalimat 3 beri opsi aksi yang proporsional untuk stok atau belanja, dengan bahasa pertimbangan yang tetap tegas.",
  "offer": "satu kalimat pendek ajakan konsultasi stok/modal"
}

Gaya harus seperti analis bisnis UMKM: natural, tajam, tidak kaku, tidak seperti
template. Jangan menjelaskan proses model. Jangan memakai format titik dua.
Jangan menulis disclaimer seperti "ini hanya prediksi", "bukan kepastian pasar",
atau "perlu diingat"; disclaimer sudah ditampilkan terpisah di UI. Jangan
menyuruh user membeli secara mutlak. Jika ingin menulis "Perlu diingat", hapus
kalimat itu dan ganti dengan insight aksi yang lebih berguna.
"""

    try:
        data = generate_gemini_json(
            prompt=prompt,
            system_instruction=NARAPANGAN_SYSTEM_PROMPT,
        )
    except GeminiQuotaError as exc:
        fallback["llm_error"] = str(exc)
        fallback["source"] = "rate_limited"
        return fallback
    except Exception as exc:
        fallback["llm_error"] = str(exc)
        return fallback

    headline = str(data.get("headline") or fallback["headline"]).strip()
    body = _strip_redundant_disclaimer(str(data.get("body") or fallback["body"]))
    offer = str(data.get("offer") or fallback["offer"]).strip()

    return {
        **fallback,
        "headline": headline,
        "body": body,
        "offer": offer,
        "source": "gemini",
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


def build_chat_reply(
    payload: dict,
    question: str,
    business_profile: dict | None = None,
    chat_history: list[dict[str, str]] | None = None,
) -> dict:
    fallback_context = build_rule_based_explanation(payload, business_profile)
    chat_history = chat_history or []
    if _is_obviously_out_of_scope(question):
        return {
            "reply": (
                "Saya hanya bisa membantu konsultasi seputar prediksi harga cabai, "
                "stok, pembelian, dan keputusan UMKM berdasarkan hasil Narapangan. "
                "Coba tanyakan strategi belanja cabai atau risiko harga minggu depan."
            ),
            "source": "guardrail",
        }

    if not is_gemini_configured():
        return {
            "reply": (
                "Mode konsultasi AI belum aktif karena GEMINI_API_KEY belum tersedia. "
                "Namun berdasarkan sinyal saat ini: "
                + fallback_context["body"]
            ),
            "source": "rule_based",
        }

    prompt = (
        _forecast_context_for_prompt(payload, business_profile)
        + "\n\n"
        + _chat_history_context(chat_history)
        + "\n\nPertanyaan user:\n"
        + question
        + "\n\nJawab langsung sebagai konsultan UMKM. Jika pertanyaan di luar domain "
        + "Narapangan, tolak singkat dan arahkan kembali ke topik prediksi harga cabai, "
        + "stok, pembelian, atau strategi UMKM. Jika pertanyaan relevan, gunakan angka "
        + "forecast dan profil UMKM di atas. Jawab seperti chat konsultasi bisnis, "
        + "bukan template laporan. Gunakan 2-4 kalimat pendek atau maksimal 3 bullet "
        + "pendek. Boleh pakai **tebal** atau *miring* hanya untuk angka atau istilah "
        + "yang benar-benar penting. Jangan pakai heading atau label kaku seperti "
        + "'Strategi:' dan 'Rekomendasi:'. Jangan menggantung di tengah kalimat. "
        + "Jangan menyebut nama arsitektur model teknis. Jawaban harus berupa "
        + "pertimbangan berbasis prediksi, bukan instruksi mutlak untuk membeli. "
        + "Jika pertanyaan user merujuk jawaban sebelumnya, gunakan riwayat sesi "
        + "untuk menjaga konteks."
    )

    try:
        reply_text = generate_gemini_text(
            prompt,
            system_instruction=NARAPANGAN_SYSTEM_PROMPT,
        )
        return {
            "reply": _clean_chat_reply(reply_text),
            "source": "gemini",
        }
    except GeminiQuotaError as exc:
        return {
            "reply": (
                "Kuota Gemini sedang penuh, jadi saya pakai fallback sementara. "
                + fallback_context["body"]
            ),
            "source": "rate_limited",
            "llm_error": str(exc),
        }
    except Exception as exc:
        return {
            "reply": (
                "AI konsultasi sedang gagal dipanggil. Sebagai fallback, "
                + fallback_context["body"]
            ),
            "source": "rule_based",
            "llm_error": str(exc),
        }


class NarapanganHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, body: dict):
        encoded = json.dumps(body, default=_json_default).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(encoded)

    def _read_json(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length == 0:
            return {}

        raw_body = self.rfile.read(content_length).decode("utf-8")
        return json.loads(raw_body)

    def _authenticate(self) -> dict | None:
        """Extracts and validates the JWT Bearer token from the Authorization header."""
        auth_header = self.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        token = auth_header.split(" ")[1]
        return verify_token(token)

    def do_OPTIONS(self):
        self._send_json(200, {"ok": True})

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            self._send_json(200, {"ok": True, "service": "narapangan-api"})
            return

        if path == "/api/users/profile":
            user_data = self._authenticate()
            if not user_data:
                self._send_json(401, {"error": "Sesi kedaluwarsa atau tidak sah. Silakan login kembali."})
                return

            try:
                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT email, is_admin, business_type, daily_usage_kg, stock_days, storage_capacity_kg, buying_style, can_adjust_price FROM users WHERE id = ?",
                    (user_data["user_id"],)
                )
                row = cursor.fetchone()
                conn.close()

                if not row:
                    self._send_json(404, {"error": "Pengguna tidak ditemukan."})
                    return

                profile = {
                    "business_type": row["business_type"] or "",
                    "daily_usage_kg": row["daily_usage_kg"] if row["daily_usage_kg"] is not None else "",
                    "stock_days": row["stock_days"] if row["stock_days"] is not None else "",
                    "storage_capacity_kg": row["storage_capacity_kg"] if row["storage_capacity_kg"] is not None else "",
                    "buying_style": row["buying_style"] or "Aman stok",
                    "can_adjust_price": row["can_adjust_price"] or "Sulit naik harga"
                }
                self._send_json(200, {"profile": profile})
            except Exception as e:
                import traceback
                traceback.print_exc()
                self._send_json(500, {"error": "Gagal mengambil profil.", "detail": str(e)})
            return

        self._send_json(404, {"error": "Endpoint tidak ditemukan."})

    def do_POST(self):
        path = urlparse(self.path).path

        # 1. Login endpoint (Open)
        if path == "/api/auth/login":
            try:
                body = self._read_json()
                email = str(body.get("email") or "").strip().lower()
                password = str(body.get("password") or "")

                if not email or not password:
                    self._send_json(400, {"error": "Email dan password wajib diisi."})
                    return

                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT id, email, password_hash, is_admin, business_type, daily_usage_kg, stock_days, storage_capacity_kg, buying_style, can_adjust_price FROM users WHERE email = ?",
                    (email,)
                )
                row = cursor.fetchone()
                conn.close()

                if not row or not verify_password(password, row["password_hash"]):
                    self._send_json(401, {"error": "Email atau password salah."})
                    return

                user_payload = {
                    "user_id": row["id"],
                    "email": row["email"],
                    "is_admin": bool(row["is_admin"])
                }
                token = create_token(user_payload)

                profile = {
                    "business_type": row["business_type"] or "",
                    "daily_usage_kg": row["daily_usage_kg"] if row["daily_usage_kg"] is not None else "",
                    "stock_days": row["stock_days"] if row["stock_days"] is not None else "",
                    "storage_capacity_kg": row["storage_capacity_kg"] if row["storage_capacity_kg"] is not None else "",
                    "buying_style": row["buying_style"] or "Aman stok",
                    "can_adjust_price": row["can_adjust_price"] or "Sulit naik harga"
                }

                self._send_json(200, {
                    "token": token,
                    "user": {
                        "email": row["email"],
                        "is_admin": bool(row["is_admin"])
                    },
                    "profile": profile
                })
            except Exception as e:
                import traceback
                traceback.print_exc()
                self._send_json(500, {"error": "Gagal masuk.", "detail": str(e)})
            return

        # 1.1. Register endpoint (Open)
        if path == "/api/auth/register":
            try:
                body = self._read_json()
                email = str(body.get("email") or "").strip().lower()
                password = str(body.get("password") or "")

                if not email or not password:
                    self._send_json(400, {"error": "Email dan password wajib diisi."})
                    return

                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM users WHERE email = ?", (email,))
                if cursor.fetchone()[0] > 0:
                    conn.close()
                    self._send_json(400, {"error": "Email sudah terdaftar."})
                    return

                from backend.api.auth import hash_password
                pw_hash = hash_password(password)

                cursor.execute("""
                    INSERT INTO users (email, password_hash, is_admin)
                    VALUES (?, ?, 0)
                """, (email, pw_hash))
                user_id = cursor.lastrowid
                conn.commit()
                conn.close()

                user_payload = {
                    "user_id": user_id,
                    "email": email,
                    "is_admin": False
                }
                token = create_token(user_payload)
                profile = {
                    "business_type": "",
                    "daily_usage_kg": "",
                    "stock_days": "",
                    "storage_capacity_kg": "",
                    "buying_style": "Aman stok",
                    "can_adjust_price": "Sulit naik harga"
                }

                self._send_json(200, {
                    "token": token,
                    "user": { "email": email, "is_admin": False },
                    "profile": profile
                })
            except Exception as e:
                import traceback
                traceback.print_exc()
                self._send_json(500, {"error": "Registrasi gagal.", "detail": str(e)})
            return

        # 1.2. Google Simulated Auth endpoint (Open)
        if path == "/api/auth/google-simulated":
            try:
                body = self._read_json()
                email = str(body.get("email") or "google-user@gmail.com").strip().lower()
                
                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT id, email, is_admin, business_type, daily_usage_kg, stock_days, storage_capacity_kg, buying_style, can_adjust_price FROM users WHERE email = ?",
                    (email,)
                )
                row = cursor.fetchone()

                if not row:
                    from backend.api.auth import hash_password
                    dummy_hash = hash_password("sso-google-only")
                    cursor.execute("""
                        INSERT INTO users (email, password_hash, is_admin)
                        VALUES (?, ?, 0)
                    """, (email, dummy_hash))
                    user_id = cursor.lastrowid
                    conn.commit()
                    profile = {
                        "business_type": "",
                        "daily_usage_kg": "",
                        "stock_days": "",
                        "storage_capacity_kg": "",
                        "buying_style": "Aman stok",
                        "can_adjust_price": "Sulit naik harga"
                    }
                    is_admin = False
                else:
                    user_id = row["id"]
                    is_admin = bool(row["is_admin"])
                    profile = {
                        "business_type": row["business_type"] or "",
                        "daily_usage_kg": row["daily_usage_kg"] if row["daily_usage_kg"] is not None else "",
                        "stock_days": row["stock_days"] if row["stock_days"] is not None else "",
                        "storage_capacity_kg": row["storage_capacity_kg"] if row["storage_capacity_kg"] is not None else "",
                        "buying_style": row["buying_style"] or "Aman stok",
                        "can_adjust_price": row["can_adjust_price"] or "Sulit naik harga"
                    }
                conn.close()

                user_payload = {
                    "user_id": user_id,
                    "email": email,
                    "is_admin": is_admin
                }
                token = create_token(user_payload)

                self._send_json(200, {
                    "token": token,
                    "user": { "email": email, "is_admin": is_admin },
                    "profile": profile
                })
            except Exception as e:
                import traceback
                traceback.print_exc()
                self._send_json(500, {"error": "Google login gagal.", "detail": str(e)})
            return

        # 2. Authenticated Endpoints
        user_data = self._authenticate()
        if not user_data:
            self._send_json(401, {"error": "Sesi kedaluwarsa atau tidak sah. Silakan login kembali."})
            return

        if path == "/api/users/profile":
            try:
                body = self._read_json()
                profile = _clean_business_profile(body.get("profile"))

                daily_usage = float(profile.get("daily_usage_kg")) if profile.get("daily_usage_kg") else None
                stock_days = int(profile.get("stock_days")) if profile.get("stock_days") else None
                storage_capacity = float(profile.get("storage_capacity_kg")) if profile.get("storage_capacity_kg") else None

                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE users
                    SET business_type = ?,
                        daily_usage_kg = ?,
                        stock_days = ?,
                        storage_capacity_kg = ?,
                        buying_style = ?,
                        can_adjust_price = ?
                    WHERE id = ?
                """, (
                    profile.get("business_type") or None,
                    daily_usage,
                    stock_days,
                    storage_capacity,
                    profile.get("buying_style") or "Aman stok",
                    profile.get("can_adjust_price") or "Sulit naik harga",
                    user_data["user_id"]
                ))
                conn.commit()
                conn.close()

                self._send_json(200, {"ok": True, "profile": profile})
            except Exception as e:
                import traceback
                traceback.print_exc()
                self._send_json(500, {"error": "Gagal menyimpan profil.", "detail": str(e)})
            return

        if path == "/api/predict":
            self._handle_predict(user_data)
            return

        if path == "/api/chat":
            self._handle_chat(user_data)
            return

        self._send_json(404, {"error": "Endpoint tidak ditemukan."})

    def _handle_predict(self, user_data):
        try:
            print(f"[predict] Request diterima untuk user_id={user_data['user_id']}")
            request_body = self._read_json()
            end_date = request_body.get("end_date") or None

            # Query profile from database
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT business_type, daily_usage_kg, stock_days, storage_capacity_kg, buying_style, can_adjust_price FROM users WHERE id = ?",
                (user_data["user_id"],)
            )
            row = cursor.fetchone()
            conn.close()

            if row:
                business_profile = {
                    "business_type": row["business_type"] or "",
                    "daily_usage_kg": str(row["daily_usage_kg"]) if row["daily_usage_kg"] is not None else "",
                    "stock_days": str(row["stock_days"]) if row["stock_days"] is not None else "",
                    "storage_capacity_kg": str(row["storage_capacity_kg"]) if row["storage_capacity_kg"] is not None else "",
                    "buying_style": row["buying_style"] or "Aman stok",
                    "can_adjust_price": row["can_adjust_price"] or "Sulit naik harga"
                }
            else:
                business_profile = {}

            # 1. Try loading from cache file
            payload = load_payload_from_cache()
            
            if payload:
                print("[predict] Cache hit: Loaded from latest_payload.json")
            else:
                print("[predict] Cache miss: Attempting DB reconstruction...")
                # 2. Try database reconstruction
                payload = reconstruct_web_payload_from_db()
                if payload:
                    print("[predict] DB reconstruction successful.")
                    save_payload_to_cache(payload)
                else:
                    # Database is empty. Trigger async pipeline execution and return 202.
                    global IS_PIPELINE_RUNNING
                    already_running = False
                    with PIPELINE_LOCK:
                        if IS_PIPELINE_RUNNING:
                            already_running = True
                        else:
                            IS_PIPELINE_RUNNING = True
                    
                    if already_running:
                        print("[predict] Pipeline is already running in background.")
                        self._send_json(202, {
                            "status": "generating",
                            "message": "Analisis harga baru sedang diproses..."
                        })
                        return
                    else:
                        print("[predict] DB is empty. Starting background pipeline execution...")
                        def run_pipeline_async():
                            global IS_PIPELINE_RUNNING
                            try:
                                pipeline_result = run_narapangan_pipeline(headless=True)
                                p = build_web_payload(pipeline_result)
                                save_payload_to_cache(p)
                                print("[ASYNC-PIPELINE] Completed successfully. Cache populated.")
                            except Exception as async_err:
                                print(f"[ASYNC-PIPELINE] Error running background pipeline: {async_err}")
                            finally:
                                with PIPELINE_LOCK:
                                    IS_PIPELINE_RUNNING = False

                        import threading
                        t = threading.Thread(target=run_pipeline_async, daemon=True)
                        t.start()
                        
                        self._send_json(202, {
                            "status": "generating",
                            "message": "Analisis harga baru sedang diproses..."
                        })
                        return

            # 3. Generate dynamic LLM explanation tailored to user's profile
            payload["explanation"] = build_llm_explanation(
                payload,
                business_profile=business_profile,
            )
            payload["business_profile"] = business_profile

            source = payload.get("explanation", {}).get("source", "unknown")
            print(f"[predict] Selesai. explanation.source={source}")
            if payload.get("explanation", {}).get("llm_error"):
                print(f"[predict] LLM fallback: {payload['explanation']['llm_error']}")

            self._send_json(200, payload)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            self._send_json(
                500,
                {
                    "error": "Pipeline prediksi gagal dijalankan.",
                    "detail": str(exc),
                },
            )

    def _handle_chat(self, user_data):
        try:
            print(f"[chat] Request diterima untuk user_id={user_data['user_id']}")
            request_body = self._read_json()
            payload = request_body.get("payload")
            question = str(request_body.get("question") or "").strip()
            chat_history = _clean_chat_history(request_body.get("chat_history"))

            if not isinstance(payload, dict):
                self._send_json(400, {"error": "Payload hasil prediksi belum tersedia."})
                return
            if not question:
                self._send_json(400, {"error": "Pertanyaan tidak boleh kosong."})
                return

            # Query profile from database
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT business_type, daily_usage_kg, stock_days, storage_capacity_kg, buying_style, can_adjust_price FROM users WHERE id = ?",
                (user_data["user_id"],)
            )
            row = cursor.fetchone()
            conn.close()

            if row:
                business_profile = {
                    "business_type": row["business_type"] or "",
                    "daily_usage_kg": str(row["daily_usage_kg"]) if row["daily_usage_kg"] is not None else "",
                    "stock_days": str(row["stock_days"]) if row["stock_days"] is not None else "",
                    "storage_capacity_kg": str(row["storage_capacity_kg"]) if row["storage_capacity_kg"] is not None else "",
                    "buying_style": row["buying_style"] or "Aman stok",
                    "can_adjust_price": row["can_adjust_price"] or "Sulit naik harga"
                }
            else:
                business_profile = {}

            reply = build_chat_reply(
                payload=payload,
                question=question,
                business_profile=business_profile,
                chat_history=chat_history,
            )
            source = reply.get("source", "unknown")
            print(f"[chat] Selesai. reply.source={source}")
            if reply.get("llm_error"):
                print(f"[chat] LLM fallback: {reply['llm_error']}")
            self._send_json(200, reply)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            self._send_json(
                500,
                {
                    "error": "Konsultasi AI gagal dijalankan.",
                    "detail": str(exc),
                },
            )

    def log_message(self, format, *args):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {self.address_string()} - {format % args}")


def run_scheduler_loop():
    import time
    import threading
    from backend.database import get_connection

    print("[SERVER-SCHEDULER] Background scheduler thread initiated.")
    # Wait 5 seconds after server startup before checking
    time.sleep(5)

    while True:
        try:
            today_str = datetime.now().strftime("%Y-%m-%d")
            
            # Check crawls table in SQLite
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM crawls WHERE run_date = ?", (today_str,))
            already_run = cursor.fetchone()[0] > 0
            conn.close()
            
            if not already_run:
                print(f"[SERVER-SCHEDULER] Forecast for today ({today_str}) is missing. Launching pipeline update in background...")
                try:
                    # Execute daily forecast and write JSON cache
                    pipeline_result = run_narapangan_pipeline(headless=True)
                    payload = build_web_payload(pipeline_result)
                    save_payload_to_cache(payload)
                    print(f"[SERVER-SCHEDULER] Forecast update completed successfully for {today_str}.")
                except Exception as inner_e:
                    print(f"[SERVER-SCHEDULER] Pipeline run failed: {inner_e}. Will retry in 15 minutes...")
                    time.sleep(15 * 60)
                    continue
            else:
                # Cache is fresh for today, idle check is complete.
                pass
        except Exception as e:
            print(f"[SERVER-SCHEDULER] Error in scheduler loop: {e}")

        # Check again in 1 hour
        time.sleep(60 * 60)


def run_server(host: str = HOST, port: int = PORT):
    # Spawn background scheduler loop
    import threading
    scheduler_thread = threading.Thread(target=run_scheduler_loop, daemon=True)
    scheduler_thread.start()

    server = ThreadingHTTPServer((host, port), NarapanganHandler)
    print(f"Narapangan API running at http://{host}:{port}")
    print("Endpoint: POST /api/predict")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
