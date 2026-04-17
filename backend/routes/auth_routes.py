from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from mysql.connector import Error

from backend.auth_utils import clean_user_row, create_session, fetch_user_by_email, fetch_user_by_id, get_current_user, hash_password, require_role, verify_password
from backend.core import get_db_config, open_connection
from backend.schemas import AdminCreateUserPayload, ChangePasswordPayload, LoginPayload, SignupPayload

router = APIRouter()


@router.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Welcome to the Hokie Market API"}


@router.get("/api/test-db")
def test_db_connection() -> dict[str, Any]:
    connection = open_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT DATABASE();")
            db_name = cursor.fetchone()
        return {"status": "Success", "database": db_name[0] if db_name else None, "host": get_db_config()["host"], "port": get_db_config()["port"]}
    finally:
        connection.close()


@router.post("/api/auth/signup", status_code=201)
def signup(payload: SignupPayload) -> dict[str, Any]:
    connection = open_connection()
    try:
        if fetch_user_by_email(connection, payload.email):
            raise HTTPException(status_code=409, detail="An account with that email already exists.")
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO `user` (email, name, phoneNo, passwordHash, role, createdAt) VALUES (%s, %s, %s, %s, %s, UTC_TIMESTAMP())",
                (payload.email.lower().strip(), payload.name.strip(), payload.phoneNo.strip(), hash_password(payload.password), payload.role),
            )
            new_user_id = cursor.lastrowid
            session = create_session(connection, new_user_id)
        connection.commit()
        user = fetch_user_by_id(connection, new_user_id)
        if not user:
            raise HTTPException(status_code=500, detail="User account was created but could not be reloaded.")
        return {"user": clean_user_row(user), "token": session["token"], "expiresAt": session["expiresAt"]}
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Signup failed: {exc}") from exc
    finally:
        connection.close()


@router.post("/api/auth/login")
def login(payload: LoginPayload) -> dict[str, Any]:
    connection = open_connection()
    try:
        user = fetch_user_by_email(connection, payload.email)
        if not user or not verify_password(payload.password, user["passwordHash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        session = create_session(connection, user["userID"])
        connection.commit()
        return {"user": clean_user_row(user), "token": session["token"], "expiresAt": session["expiresAt"]}
    except HTTPException:
        connection.rollback()
        raise
    finally:
        connection.close()


@router.post("/api/auth/logout")
def logout(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, str]:
    connection = open_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("UPDATE usersession SET revokedAt = UTC_TIMESTAMP() WHERE sessionID = %s", (current_user["sessionID"],))
        connection.commit()
        return {"status": "logged_out"}
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Logout failed: {exc}") from exc
    finally:
        connection.close()


@router.post("/api/auth/change-password")
def change_password(payload: ChangePasswordPayload, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, str]:
    if not verify_password(payload.currentPassword, current_user["passwordHash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    connection = open_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("UPDATE `user` SET passwordHash = %s WHERE userID = %s", (hash_password(payload.newPassword), current_user["userID"]))
            cursor.execute("UPDATE usersession SET revokedAt = UTC_TIMESTAMP() WHERE userID = %s AND revokedAt IS NULL", (current_user["userID"],))
        connection.commit()
        return {"status": "password_updated"}
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Password change failed: {exc}") from exc
    finally:
        connection.close()


@router.get("/api/me")
def get_me(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return clean_user_row(current_user)


@router.post("/api/admin/users", status_code=201)
def admin_create_user(payload: AdminCreateUserPayload, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    require_role(current_user, {"admin"})
    connection = open_connection()
    try:
        if fetch_user_by_email(connection, payload.email):
            raise HTTPException(status_code=409, detail="An account with that email already exists.")
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO `user` (email, name, phoneNo, passwordHash, role, createdAt) VALUES (%s, %s, %s, %s, %s, UTC_TIMESTAMP())",
                (payload.email.lower().strip(), payload.name.strip(), payload.phoneNo.strip(), hash_password(payload.password), payload.role),
            )
            new_user_id = cursor.lastrowid
        connection.commit()
        user = fetch_user_by_id(connection, new_user_id)
        if not user:
            raise HTTPException(status_code=500, detail="User account was created but could not be reloaded.")
        return clean_user_row(user)
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"User creation failed: {exc}") from exc
    finally:
        connection.close()
