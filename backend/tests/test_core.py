from __future__ import annotations

import unittest
from unittest.mock import patch

from backend.tests.bootstrap import ensure_test_stubs

ensure_test_stubs()

from fastapi import HTTPException
from mysql.connector import Error

from backend import core


class GetDbConfigTests(unittest.TestCase):
    def test_get_db_config_uses_environment_overrides(self) -> None:
        env = {
            "DB_HOST": "db.example.com",
            "DB_PORT": "4406",
            "SQL_USER": "alice",
            "SQL_PASSWORD": "secret",
            "DB_NAME": "hokiemarket",
        }
        with patch.dict("os.environ", env, clear=False):
            config = core.get_db_config()

        self.assertEqual(config["host"], "db.example.com")
        self.assertEqual(config["port"], 4406)
        self.assertEqual(config["user"], "alice")
        self.assertEqual(config["password"], "secret")
        self.assertEqual(config["database"], "hokiemarket")


class OpenConnectionTests(unittest.TestCase):
    def test_open_connection_requires_credentials(self) -> None:
        with patch("backend.core.get_db_config", return_value={"host": "localhost", "port": 3306, "user": None, "password": None, "database": "db"}):
            with self.assertRaises(HTTPException) as ctx:
                core.open_connection()

        self.assertEqual(ctx.exception.status_code, 500)
        self.assertIn("Missing database credentials", ctx.exception.detail)

    def test_open_connection_wraps_mysql_errors(self) -> None:
        config = {"host": "localhost", "port": 3306, "user": "user", "password": "pw", "database": "db"}
        with patch("backend.core.get_db_config", return_value=config), patch("backend.core.mysql.connector.connect", side_effect=Error("boom")):
            with self.assertRaises(HTTPException) as ctx:
                core.open_connection()

        self.assertEqual(ctx.exception.status_code, 500)
        self.assertIn("Database connection failed", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()
