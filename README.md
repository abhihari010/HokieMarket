# Hokie Market

The Hokie Market system is a web-based marketplace designed to allow college students to buy and sell items such as textbooks, electronics,
furniture, and other campus-related goods within their university community. The application provides a structured environment where users
can create listings, browse available items, communicate with other users, participate in auctions, and complete transactions.

Hokie Market is a full-stack marketplace project with a FastAPI backend, a React + Vite frontend, and MySQL schema/seed scripts for local setup.

## Repository Link

Add your public GitHub or GitLab repository link here.

## Repository Structure

```text
hokiemarket/
|-- README.md
|-- docs/
|-- db/
|-- backend/
|-- frontend/
|-- reports/
`-- roles/
```

## Tech Stack

- Backend: FastAPI, Python, MySQL
- Frontend: React, TypeScript, Vite
- Database setup: SQL schema + seed scripts in `db/`

## Backend API Scope

The current backend includes CRUD endpoints for the `listing` table:

- `GET /api/test-db`
- `GET /api/listing-form-options`
- `GET /api/listings`
- `POST /api/listings`
- `PUT /api/listings/{listing_id}`
- `DELETE /api/listings/{listing_id}`

## Local Setup

### 1. Backend

1. Create `backend/.env` from `backend/.env.example`.
2. Install Python dependencies:

```powershell
pip install -r backend/requirements.txt
```

3. Make sure your local MySQL server is running and reachable with the credentials in `backend/.env`.
4. Build the schema and seed/reset the tables:

```powershell
python db/run_migration.py
```

5. Start the backend:

```powershell
uvicorn backend.main:app --reload
```

### 2. Frontend

1. Create `frontend/.env` from `frontend/.env.example` if you want to override the backend URL.
2. Install frontend dependencies:

```powershell
cd frontend
npm install
```

3. Start the frontend:

```powershell
npm run dev
```

The frontend expects the FastAPI backend to already be running.

## Database Notes

`db/run_migration.py` applies the SQL files in `db/` in filename order.

- `db/000_phase5_schema.sql` creates the database objects from scratch.
- `db/001_phase5_seed.sql` resets and repopulates those tables with demo data.

## Current Limitations

- The CRUD scaffold is centered on standard `listing` rows.
- Creating or updating auction listings is intentionally not implemented because it would also require coordinated writes to the `auction` table.
- Deleting seeded listings may fail if related rows exist in tables like `listingimage`, `conversation`, `auction`, or `transaction`. For demos, the safest flow is to create a new fixed-price listing first, then delete that new row.
