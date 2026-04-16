import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import mysql.connector
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from backend.core import open_connection, security

PASSWORD_HASH_ITERATIONS = 390000
SESSION_DURATION_HOURS = 24


def encode_urlsafe(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def hash_password(password: str) -> str:
    salt = encode_urlsafe(secrets.token_bytes(16))
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PASSWORD_HASH_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt}${encode_urlsafe(digest)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt, digest = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iterations_text))
        return hmac.compare_digest(encode_urlsafe(candidate), digest)
    except (TypeError, ValueError):
        return False


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def clean_user_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "userID": row["userID"],
        "email": row["email"],
        "name": row["name"],
        "phoneNo": row["phoneNo"],
        "role": row["role"],
        "createdAt": row["createdAt"],
    }


def require_role(user: dict[str, Any], allowed_roles: set[str]) -> None:
    if user["role"] not in allowed_roles:
        raise HTTPException(status_code=403, detail="You do not have permission to perform this action.")


def fetch_user_by_email(connection: mysql.connector.MySQLConnection, email: str) -> dict[str, Any] | None:
    with connection.cursor(dictionary=True) as cursor:
        cursor.execute(
            "SELECT userID, email, name, phoneNo, passwordHash, role, createdAt FROM `user` WHERE email = %s",
            (email.lower().strip(),),
        )
        return cursor.fetchone()


def fetch_user_by_id(connection: mysql.connector.MySQLConnection, user_id: int) -> dict[str, Any] | None:
    with connection.cursor(dictionary=True) as cursor:
        cursor.execute(
            "SELECT userID, email, name, phoneNo, passwordHash, role, createdAt FROM `user` WHERE userID = %s",
            (user_id,),
        )
        return cursor.fetchone()


def create_session(connection: mysql.connector.MySQLConnection, user_id: int) -> dict[str, Any]:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=SESSION_DURATION_HOURS)
    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO usersession (userID, tokenHash, createdAt, expiresAt, revokedAt) VALUES (%s, %s, UTC_TIMESTAMP(), %s, NULL)",
            (user_id, hash_token(token), expires_at.replace(tzinfo=None)),
        )
    return {"token": token, "expiresAt": expires_at}


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication is required.")
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT u.userID, u.email, u.name, u.phoneNo, u.passwordHash, u.role, u.createdAt, s.sessionID
                FROM usersession AS s
                JOIN `user` AS u ON u.userID = s.userID
                WHERE s.tokenHash = %s AND s.revokedAt IS NULL AND s.expiresAt > UTC_TIMESTAMP()
                """,
                (hash_token(credentials.credentials),),
            )
            row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Your session is invalid or has expired.")
        return row
    finally:
        connection.close()
