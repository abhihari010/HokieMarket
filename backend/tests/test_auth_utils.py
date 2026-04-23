from __future__ import annotations

import unittest
from unittest.mock import patch

from backend.tests.bootstrap import ensure_test_stubs

ensure_test_stubs()

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from backend import auth_utils
from backend.tests.test_helpers import FakeConnection, FakeCursor


class PasswordTests(unittest.TestCase):
    def test_hash_password_round_trips(self) -> None:
        hashed = auth_utils.hash_password("correct horse battery staple")
        self.assertTrue(hashed.startswith("pbkdf2_sha256$"))
        self.assertTrue(auth_utils.verify_password("correct horse battery staple", hashed))
        self.assertFalse(auth_utils.verify_password("wrong", hashed))

    def test_verify_password_rejects_invalid_hash_format(self) -> None:
        self.assertFalse(auth_utils.verify_password("password123", "not-a-real-hash"))

    def test_hash_token_is_stable(self) -> None:
        self.assertEqual(auth_utils.hash_token("abc"), auth_utils.hash_token("abc"))


class UserHelperTests(unittest.TestCase):
    def test_clean_user_row_removes_password_hash(self) -> None:
        row = {
            "userID": 1,
            "email": "test@example.com",
            "name": "Test User",
            "phoneNo": "5551234567",
            "passwordHash": "hidden",
            "role": "member",
            "createdAt": "now",
        }

        cleaned = auth_utils.clean_user_row(row)

        self.assertNotIn("passwordHash", cleaned)
        self.assertEqual(cleaned["email"], "test@example.com")

    def test_require_role_rejects_disallowed_role(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            auth_utils.require_role({"role": "member"}, {"admin"})

        self.assertEqual(ctx.exception.status_code, 403)


class SessionTests(unittest.TestCase):
    def test_create_session_inserts_hashed_token(self) -> None:
        cursor = FakeCursor()
        connection = FakeConnection([cursor])

        session = auth_utils.create_session(connection, 17)

        self.assertIn("token", session)
        self.assertIn("expiresAt", session)
        self.assertEqual(len(cursor.executed), 1)
        query, params = cursor.executed[0]
        self.assertIn("INSERT INTO usersession", query)
        self.assertEqual(params[0], 17)
        self.assertEqual(params[1], auth_utils.hash_token(session["token"]))

    def test_get_current_user_requires_credentials(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            auth_utils.get_current_user(None)

        self.assertEqual(ctx.exception.status_code, 401)

    def test_get_current_user_returns_user_for_valid_session(self) -> None:
        row = {
            "userID": 9,
            "email": "user@example.com",
            "name": "User",
            "phoneNo": "5551234567",
            "passwordHash": "hash",
            "role": "member",
            "createdAt": "today",
            "sessionID": 33,
        }
        connection = FakeConnection([FakeCursor(fetchone_values=[row])])
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="plain-token")

        with patch("backend.auth_utils.open_connection", return_value=connection):
            result = auth_utils.get_current_user(credentials)

        self.assertEqual(result["userID"], 9)
        self.assertTrue(connection.close_called)

    def test_get_current_user_rejects_invalid_session(self) -> None:
        connection = FakeConnection([FakeCursor(fetchone_values=[None])])
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="plain-token")

        with patch("backend.auth_utils.open_connection", return_value=connection):
            with self.assertRaises(HTTPException) as ctx:
                auth_utils.get_current_user(credentials)

        self.assertEqual(ctx.exception.status_code, 401)
        self.assertTrue(connection.close_called)


if __name__ == "__main__":
    unittest.main()
