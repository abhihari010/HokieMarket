from pathlib import Path

import mysql.connector
from dotenv import dotenv_values


def main() -> None:
    backend_dir = Path(__file__).resolve().parent
    env_values = dotenv_values(backend_dir / ".env")
    sql_path = backend_dir / "migrations" / "001_phase5_seed.sql"
    sql_text = sql_path.read_text(encoding="utf-8")

    missing_keys = [key for key in ("SQL_USER", "SQL_PASSWORD") if not env_values.get(key)]
    if missing_keys:
        missing = ", ".join(missing_keys)
        raise SystemExit(
            f"Missing {missing} in backend/.env. Copy backend/.env.example and fill in your local MySQL settings."
        )

    connection = mysql.connector.connect(
        host=env_values.get("DB_HOST", "localhost"),
        port=int(env_values.get("DB_PORT", 3308)),
        user=env_values["SQL_USER"],
        password=env_values["SQL_PASSWORD"],
        database=env_values.get("DB_NAME", "marketplacedb"),
    )

    try:
        with connection.cursor() as cursor:
            statements = [statement.strip() for statement in sql_text.split(";") if statement.strip()]
            for statement in statements:
                cursor.execute(statement)
        connection.commit()
        print(f"Applied migration data: {sql_path.name}")
        print("Note: this file seeds existing tables. It does not create the schema from scratch.")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
