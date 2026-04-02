# Hokie Market Backend Phase 5 Notes

This backend now includes a minimal FastAPI CRUD scaffold for the `listing` table:

- `GET /api/test-db`
- `GET /api/listing-form-options`
- `GET /api/listings`
- `POST /api/listings`
- `PUT /api/listings/{listing_id}`
- `DELETE /api/listings/{listing_id}`

## Local setup

1. Create `backend/.env` from `backend/.env.example`.
2. Install Python dependencies:

```powershell
pip install -r backend/requirements.txt
```

3. Make sure your local MySQL server is running and reachable with the credentials in `backend/.env`.
4. Build the schema and seed/reset the tables:

```powershell
python backend/run_migration.py
```

If you prefer to run the SQL files manually in MySQL Workbench, replace `{{DB_NAME}}` with your database name before executing the scripts.

5. Start the backend:

```powershell
python -m uvicorn backend.main:app --reload
```

## Important limitation

`backend/run_migration.py` now applies the SQL files in `backend/migrations` in filename order.

- `backend/migrations/000_phase5_schema.sql` creates the database objects from scratch.
- `backend/migrations/001_phase5_seed.sql` resets and repopulates those tables with demo data.

That means a teammate can now recreate the local Phase 5 database from scratch with one command, as long as the MySQL server is running and the credentials in `backend/.env` are valid.

This setup was locally verified with a real MySQL instance by creating the schema, seeding the data, and testing `listing` insert, update, and delete through the running frontend and backend.

## Phase 5 demo notes

- The CRUD scaffold is centered on standard `listing` rows.
- Creating or updating auction listings is intentionally not implemented because it would also require coordinated writes to the `auction` table.
- Deleting seeded listings may fail if related rows exist in tables like `listingimage`, `conversation`, `auction`, or `transaction`. For demo purposes, the safest delete flow is to create a new fixed-price listing first, then delete that new row.
