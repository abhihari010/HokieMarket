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

3. Make sure a local MySQL schema named `marketplacedb` already exists with the Hokie Market tables.
4. Seed/reset the existing tables:

```powershell
python backend/run_migration.py
```

5. Start the backend:

```powershell
uvicorn backend.main:app --reload
```

## Important limitation

`backend/migrations/001_phase5_seed.sql` is a seed/reset script, not a full schema creation script. It truncates and inserts data into existing tables, but it does not contain `CREATE TABLE` statements.

That means a teammate can quickly repopulate an existing local Hokie Market schema from the migration file, but cannot recreate the full database from nothing using this file alone unless they also have the schema-definition SQL from an earlier phase.

## Phase 5 demo notes

- The CRUD scaffold is centered on standard `listing` rows.
- Creating or updating auction listings is intentionally not implemented because it would also require coordinated writes to the `auction` table.
- Deleting seeded listings may fail if related rows exist in tables like `listingimage`, `conversation`, `auction`, or `transaction`. For demo purposes, the safest delete flow is to create a new fixed-price listing first, then delete that new row.
