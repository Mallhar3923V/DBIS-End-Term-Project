import os
import re
import sys
from pathlib import Path
# Dynamic import with user-friendly error message
try:
    import mysql.connector
    USE_PYMYSQL = False
except ImportError:
    try:
        import pymysql
        USE_PYMYSQL = True
    except ImportError:
        print("\n" + "=" * 60)
        print("[ERROR] Required MySQL driver is not installed!")
        print("=" * 60)
        print("\nPlease run the following command in your terminal:\n")
        print("    pip install mysql-connector-python\n")
        print("Alternatively, you can load the SQL files directly using MySQL CLI:")
        print('    & "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe" -u root -p < "01_schema.sql"')
        print('    & "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe" -u root -p < "02_triggers_views_procedures.sql"')
        print('    & "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe" -u root -p < "03_seed_data.sql"')
        print("=" * 60 + "\n")
        sys.exit(1)

# Resolve paths
BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR.parent / "backend" / ".env"

# Read DB credentials from .env
db_config = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
}

if ENV_FILE.exists():
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'\"")
                if k == "DB_HOST":
                    db_config["host"] = v
                elif k == "DB_PORT":
                    db_config["port"] = int(v)
                elif k == "DB_USER":
                    db_config["user"] = v
                elif k == "DB_PASSWORD":
                    db_config["password"] = v

def execute_sql_file(cursor, file_path):
    print(f"Executing: {file_path.name}...")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by DELIMITER if present
    if "DELIMITER //" in content:
        parts = content.split("DELIMITER //")
        # Header statements
        header = parts[0]
        for stmt in header.split(";"):
            stmt = stmt.strip()
            if stmt:
                cursor.execute(stmt)

        # Body between DELIMITER // and DELIMITER ;
        middle_and_rest = parts[1].split("DELIMITER ;")
        proc_body = middle_and_rest[0]
        for proc in proc_body.split("//"):
            proc = proc.strip()
            if proc:
                cursor.execute(proc)

        # Remaining statements
        if len(middle_and_rest) > 1:
            rest = middle_and_rest[1]
            for stmt in rest.split(";"):
                stmt = stmt.strip()
                if stmt:
                    cursor.execute(stmt)
    else:
        # Standard statement execution
        for stmt in content.split(";"):
            stmt = stmt.strip()
            if stmt:
                cursor.execute(stmt)

def main():
    print("=" * 60)
    print("PriceSense DBMS - Automated Database Setup (MySQL)")
    print("=" * 60)
    print(f"Connecting to MySQL at {db_config['host']}:{db_config['port']} as user '{db_config['user']}'...")

    try:
        if USE_PYMYSQL:
            conn = pymysql.connect(
                host=db_config["host"],
                port=db_config["port"],
                user=db_config["user"],
                password=db_config["password"],
                autocommit=True
            )
        else:
            conn = mysql.connector.connect(
                host=db_config["host"],
                port=db_config["port"],
                user=db_config["user"],
                password=db_config["password"],
                autocommit=True
            )
        cursor = conn.cursor()
        print("Connected successfully!\n")

        # Step 1: Schema
        execute_sql_file(cursor, BASE_DIR / "01_schema.sql")
        print("Schema created successfully!\n")

        # Step 2: Triggers, Views, Procedures
        execute_sql_file(cursor, BASE_DIR / "02_triggers_views_procedures.sql")
        print("Triggers, views, and stored procedures registered!\n")

        # Step 3: Seed Data
        execute_sql_file(cursor, BASE_DIR / "03_seed_data.sql")
        print("Seed data loaded successfully!\n")

        # Verify Counts
        cursor.execute("USE price_comparison_db;")
        tables = [
            "category", "product", "product_spec", "store",
            "store_listing", "price_history", "offer", "coupon_offer",
            "discount_offer", "cashback_offer", "users", "watches", "price_alert"
        ]
        print("Table Record Summary:")
        print("-" * 35)
        for tbl in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {tbl};")
            count = cursor.fetchone()[0]
            print(f"  {tbl:<22}: {count:>6} rows")
        print("-" * 35)
        print("Database initialization complete!\n")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"\n[ERROR] Database setup failed: {e}")
        print("\nPlease check your credentials in Implementation/backend/.env")
        sys.exit(1)

if __name__ == "__main__":
    main()
