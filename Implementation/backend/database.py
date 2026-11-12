"""
MySQL connection pool and FastAPI dependency for database access.
Uses mysql.connector.pooling — no ORM.
With lazy initialization so startup doesn't crash if MySQL service takes a moment.
"""

from mysql.connector.pooling import MySQLConnectionPool
from mysql.connector import Error as MySQLError
from fastapi import HTTPException

from config import settings

_pool = None

def get_pool():
    global _pool
    if _pool is None:
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
    return _pool


def get_db():
    """
    FastAPI dependency — yields a *cursor* (dictionary=True) and manages
    the connection lifecycle (commit on success, rollback on error).
    """
    connection = None
    try:
        pool = get_pool()
        connection = pool.get_connection()
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
            connection.close()
