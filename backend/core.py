import os
from pathlib import Path
from typing import Any

import mysql.connector
from dotenv import load_dotenv
from fastapi import HTTPException
from fastapi.security import HTTPBearer
from mysql.connector import Error

load_dotenv(Path(__file__).with_name(".env"))

security = HTTPBearer(auto_error=False)


def get_db_config() -> dict[str, Any]:
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("SQL_USER"),
        "password": os.getenv("SQL_PASSWORD"),
        "database": os.getenv("DB_NAME", "marketplacedb"),
    }


def open_connection() -> mysql.connector.MySQLConnection:
    db_config = get_db_config()
    if not db_config["user"] or not db_config["password"]:
        raise HTTPException(status_code=500, detail="Missing database credentials in backend/.env.")
    try:
        return mysql.connector.connect(**db_config)
    except Error as exc:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {exc}") from exc
