from pathlib import Path

import mysql.connector
from dotenv import dotenv_values


def main() -> None:
    db_dir = Path(__file__).resolve().parent
    repo_root = db_dir.parent
    backend_dir = repo_root / "backend"
    env_values = dotenv_values(backend_dir / ".env")
    db_name = env_values.get("DB_NAME", "marketplacedb")
    migration_paths = sorted(db_dir.glob("*.sql"))

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
    )

    try:
        with connection.cursor() as cursor:
            for sql_path in migration_paths:
                sql_text = sql_path.read_text(encoding="utf-8").replace("{{DB_NAME}}", db_name)
                statements = [statement.strip() for statement in sql_text.split(";") if statement.strip()]
                for statement in statements:
                    cursor.execute(statement)
        connection.commit()
        applied_names = ", ".join(path.name for path in migration_paths)
        print(f"Applied migrations: {applied_names}")
        print(f"Database is ready in schema: {db_name}")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
