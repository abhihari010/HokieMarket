from __future__ import annotations

import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from backend.tests.bootstrap import ensure_test_stubs

ensure_test_stubs()

from fastapi import HTTPException

from backend.routes import auth_routes
from backend.schemas import AdminCreateUserPayload, ChangePasswordPayload, LoginPayload, SignupPayload
from backend.tests.test_helpers import FakeConnection, FakeCursor


class AuthRouteTests(unittest.TestCase):
    def test_read_root(self) -> None:
        self.assertEqual(auth_routes.read_root(), {"message": "Welcome to the Hokie Market API"})

    def test_test_db_connection_returns_db_details(self) -> None:
        connection = FakeConnection([FakeCursor(fetchone_values=[("marketplacedb",)])])
        with patch("backend.routes.auth_routes.open_connection", return_value=connection), patch(
            "backend.routes.auth_routes.get_db_config",
            return_value={"host": "localhost", "port": 3306},
        ):
            result = auth_routes.test_db_connection()

        self.assertEqual(result["status"], "Success")
        self.assertEqual(result["database"], "marketplacedb")
        self.assertTrue(connection.close_called)

    def test_signup_creates_user_and_session(self) -> None:
        payload = SignupPayload(email="TeSt@example.com", name=" Test User ", phoneNo=" 5551234567 ", password="password123", role="member")
        connection = FakeConnection([FakeCursor(lastrowid=41)])
        session = {"token": "token", "expiresAt": datetime.now(timezone.utc)}
        user = {
            "userID": 41,
            "email": "test@example.com",
            "name": "Test User",
            "phoneNo": "5551234567",
            "role": "member",
            "createdAt": "today",
        }

        with patch("backend.routes.auth_routes.open_connection", return_value=connection), patch(
            "backend.routes.auth_routes.fetch_user_by_email", return_value=None
        ), patch("backend.routes.auth_routes.hash_password", return_value="hashed"), patch(
            "backend.routes.auth_routes.create_session", return_value=session
        ), patch("backend.routes.auth_routes.fetch_user_by_id", return_value=user):
            result = auth_routes.signup(payload)

        self.assertEqual(result["user"]["userID"], 41)
        self.assertEqual(result["token"], "token")
        self.assertTrue(connection.commit_called)
        self.assertTrue(connection.close_called)

    def test_login_rejects_invalid_credentials(self) -> None:
        payload = LoginPayload(email="user@example.com", password="password123")
        connection = FakeConnection()
        with patch("backend.routes.auth_routes.open_connection", return_value=connection), patch(
            "backend.routes.auth_routes.fetch_user_by_email", return_value=None
        ):
            with self.assertRaises(HTTPException) as ctx:
                auth_routes.login(payload)

        self.assertEqual(ctx.exception.status_code, 401)
        self.assertTrue(connection.rollback_called)

    def test_logout_revokes_session(self) -> None:
        connection = FakeConnection([FakeCursor()])
        result = None
        with patch("backend.routes.auth_routes.open_connection", return_value=connection):
            result = auth_routes.logout({"sessionID": 7})

        self.assertEqual(result, {"status": "logged_out"})
        self.assertTrue(connection.commit_called)

    def test_change_password_updates_hash_and_revokes_sessions(self) -> None:
        payload = ChangePasswordPayload(currentPassword="password123", newPassword="newpassword123")
        current_user = {"userID": 5, "passwordHash": "stored"}
        connection = FakeConnection([FakeCursor()])
        with patch("backend.routes.auth_routes.verify_password", side_effect=[True]), patch(
            "backend.routes.auth_routes.hash_password", return_value="new-hash"
        ), patch("backend.routes.auth_routes.open_connection", return_value=connection):
            result = auth_routes.change_password(payload, current_user)

        self.assertEqual(result["status"], "password_updated")
        self.assertTrue(connection.commit_called)

    def test_admin_create_user_requires_missing_reload_to_fail(self) -> None:
        payload = AdminCreateUserPayload(email="new@example.com", name="User", phoneNo="5551234567", password="password123", role="member")
        connection = FakeConnection([FakeCursor(lastrowid=50)])
        admin = {"role": "admin", "userID": 1}
        with patch("backend.routes.auth_routes.open_connection", return_value=connection), patch(
            "backend.routes.auth_routes.fetch_user_by_email", return_value=None
        ), patch("backend.routes.auth_routes.hash_password", return_value="hashed"), patch(
            "backend.routes.auth_routes.fetch_user_by_id", return_value=None
        ):
            with self.assertRaises(HTTPException) as ctx:
                auth_routes.admin_create_user(payload, admin)

        self.assertEqual(ctx.exception.status_code, 500)
        self.assertTrue(connection.rollback_called)


if __name__ == "__main__":
    unittest.main()
