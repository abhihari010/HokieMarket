from pathlib import Path

import mysql.connector
from dotenv import dotenv_values


def main() -> None:
    backend_dir = Path(__file__).resolve().parent
    env_values = dotenv_values(backend_dir / ".env")
    sql_path = backend_dir / "migrations" / "001_phase5_seed.sql"
    sql_text = sql_path.read_text(encoding="utf-8")

    connection = mysql.connector.connect(
        host="localhost",
        port=3308,
        user=env_values["SQL_USER"],
        password=env_values["SQL_PASSWORD"],
        database="marketplacedb",
    )

    try:
        with connection.cursor() as cursor:
            statements = [statement.strip() for statement in sql_text.split(";") if statement.strip()]
            for statement in statements:
                cursor.execute(statement)
        connection.commit()
        print(f"Applied migration: {sql_path.name}")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
