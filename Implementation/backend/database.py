"""
MySQL connection pool and FastAPI dependency for database access.
Uses mysql.connector.pooling — no ORM.
"""

from mysql.connector.pooling import MySQLConnectionPool
from mysql.connector import Error as MySQLError
from fastapi import HTTPException

from config import settings

# ── Connection pool (created once at import time) ─────────────────────
_pool = MySQLConnectionPool(
    pool_name="app_pool",
    pool_size=10,
    pool_reset_session=True,
    host=settings.DB_HOST,
    port=settings.DB_PORT,
    user=settings.DB_USER,
    password=settings.DB_PASSWORD,
    database=settings.DB_NAME,
    charset="utf8mb4",
    collation="utf8mb4_unicode_ci",
    autocommit=False,
)


def get_db():
    """
    FastAPI dependency — yields a *cursor* (dictionary=True) and manages
    the connection lifecycle (commit on success, rollback on error).
    """
    connection = None
    try:
        connection = _pool.get_connection()
        cursor = connection.cursor(dictionary=True)
        yield cursor
        connection.commit()
    except MySQLError as exc:
        if connection:
            connection.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()          # returns to pool
