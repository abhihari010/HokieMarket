# Hokie Market

The Hokie Market system is a web-based marketplace designed to allow college students to buy and sell items such as textbooks, electronics,
furniture, and other campus-related goods within their university community. The application provides a structured environment where users
can create listings, browse available items, communicate with other users, participate in auctions, and complete transactions.

Hokie Market is a full-stack marketplace project with a FastAPI backend, a React + Vite frontend, and MySQL schema/seed scripts for local setup.

## Repository Link

https://github.com/abhihari010/HokieMarket

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

The Phase 6 backend now supports authenticated marketplace workflows across users, listings, auctions, transactions, messaging, reviews, reports, and analytics.

### Authentication and Users

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `GET /api/me`
- `POST /api/admin/users`

### Listings

- `GET /api/test-db`
- `GET /api/listing-form-options`
- `GET /api/listings`
- `GET /api/listings/{listing_id}`
- `POST /api/listings`
- `PUT /api/listings/{listing_id}`
- `DELETE /api/listings/{listing_id}`

### Auctions and Transactions

- `POST /api/auctions/{auction_id}/bids`
- `GET /api/auctions/{auction_id}/bids`
- `POST /api/auctions/{auction_id}/close`
- `POST /api/transactions`
- `GET /api/my-transactions`
- `PUT /api/transactions/{transaction_id}/status`

### Messaging, Reviews, and Reports

- `POST /api/conversations`
- `GET /api/conversations`
- `GET /api/conversations/{conversation_id}/messages`
- `POST /api/conversations/{conversation_id}/messages`
- `POST /api/reviews`
- `GET /api/listings/{listing_id}/reviews`
- `POST /api/reports`
- `GET /api/admin/reports`
- `PUT /api/admin/reports/{report_id}`

### Analytics

- `GET /api/analytics/top-categories`
- `GET /api/analytics/seller-performance`

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

If you already created a local database during Phase 5, rerun this migration step after pulling Phase 6 changes. The Phase 6 schema adds `user.passwordHash`, `listing.status`, and the `usersession` table, so older local databases will not match the current backend until they are rebuilt.

5. Start the backend:

```powershell
python -m uvicorn backend.main:app --reload
```

Seeded accounts use the shared demo password `HokieMarket123!`.

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

The frontend expects the FastAPI backend to already be running. On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution is restricted.

## Database Notes

`db/run_migration.py` applies the SQL files in `db/` in filename order.

- `db/000_phase5_schema.sql` creates the database objects from scratch.
- `db/001_phase5_seed.sql` resets and repopulates those tables with demo data.

## Current Limitations

- Core auth flows, admin user creation, analytics reads, and authenticated listing CRUD were smoke-tested locally against the current schema, but full manual UI regression testing is still recommended on each teammate machine.
- Auction closing is implemented manually through the API and is not yet driven by a scheduled background job.
- Some advanced marketplace behaviors, such as re-opening auction outcomes after a cancelled winning transaction, are intentionally simplified for the course project.
- Deleting seeded listings may still fail if related rows exist in tables like `conversation`, `bid`, `transaction`, `report`, or `review`.
