import sqlite3
from pathlib import Path
from datetime import datetime

DATABASE_PATH = Path(__file__).resolve().parents[1] / "narapangan.db"

def get_connection():
    """Returns a sqlite3 Connection object to the Narapangan database."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initializes the SQLite database schemas if they do not exist."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            is_blocked INTEGER DEFAULT 0,
            deleted_at TEXT DEFAULT NULL,
            business_type TEXT,
            daily_usage_kg REAL,
            stock_days INTEGER,
            storage_capacity_kg REAL,
            buying_style TEXT,
            can_adjust_price TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # 2. Prices Table (Bandung PIHPS Rawit Merah)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            commodity TEXT NOT NULL,
            market TEXT NOT NULL,
            price_per_kg REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(date, commodity, market)
        );
    """)

    # 3. Weather Table (Garut NASA Weather)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS weather (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            prectotcorr REAL,
            t2m REAL,
            rh2m REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(date)
        );
    """)

    # 4. Forecasts Table (Model predictions)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            forecast_date TEXT NOT NULL,
            target_date TEXT NOT NULL,
            predicted_price REAL NOT NULL,
            model_version TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(forecast_date, target_date, model_version)
        );
    """)

    # 5. Chat Sessions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title TEXT,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)

    # 6. Chat Messages Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            message_text TEXT NOT NULL,
            source TEXT,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        );
    """)

    # 7. Crawls Log Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crawls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_date TEXT UNIQUE NOT NULL,
            timestamp INTEGER NOT NULL
        );
    """)

    # 8. Pipeline Runs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pipeline_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_date TEXT NOT NULL,
            trigger_type TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT,
            duration_seconds REAL,
            status TEXT NOT NULL,
            stage_scraping TEXT NOT NULL,
            stage_weather TEXT NOT NULL,
            stage_feat_eng TEXT NOT NULL,
            stage_forecast TEXT NOT NULL,
            stage_payload TEXT NOT NULL,
            stage_cache TEXT NOT NULL,
            error_message TEXT
        );
    """)

    # 9. Audit Logs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            target TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            details TEXT,
            FOREIGN KEY(admin_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)

    # Run migrations for existing users table if columns don't exist on disk
    for col, definition in [("is_blocked", "INTEGER DEFAULT 0"), ("deleted_at", "TEXT DEFAULT NULL")]:
        try:
            cursor.execute(f"SELECT {col} FROM users LIMIT 1")
        except sqlite3.OperationalError:
            print(f"[database] Migrating database: adding '{col}' column to 'users'")
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {definition}")

    # Create default admin user if none exists
    cursor.execute("SELECT COUNT(*) FROM users WHERE email = 'admin@narapangan.com'")
    if cursor.fetchone()[0] == 0:
        from backend.api.auth import hash_password
        admin_hash = hash_password("admin123")
        umkm_hash = hash_password("umkm123")
        
        cursor.execute("""
            INSERT INTO users (email, password_hash, is_admin, business_type)
            VALUES ('admin@narapangan.com', ?, 1, 'Admin Narapangan')
        """, (admin_hash,))
        # Default regular user
        cursor.execute("""
            INSERT INTO users (email, password_hash, is_admin, business_type, daily_usage_kg, stock_days, storage_capacity_kg, buying_style, can_adjust_price)
            VALUES ('umkm@narapangan.com', ?, 0, 'Warung Nasi', 2.0, 3, 10.0, 'Aman stok', 'Sulit naik harga')
        """, (umkm_hash,))

    conn.commit()
    conn.close()
    print(f"[database] Database initialized at {DATABASE_PATH}")

if __name__ == "__main__":
    init_db()
