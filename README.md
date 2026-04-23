# Hokie Market

Hokie Market is a full-stack student marketplace for buying and selling textbooks, electronics, furniture, tickets, dorm supplies, and other campus items. The project uses a FastAPI backend, a React + Vite frontend, and MySQL schema and seed scripts for local development.

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
- Local image uploads: FastAPI static file serving from `backend/uploads/`

## Current Product Scope

### Accounts and Roles

- Normal users are `member` accounts
- Elevated moderation and reporting access belongs to `admin` accounts
- Members can both buy and sell with the same account

### Marketplace Features

- Account signup, login, logout, and password change
- Admin user creation
- Listing creation, editing, deletion, and filtering
- Fixed-price purchases
- Auction listing creation and bidding
- Manual auction closing through the API
- Buyer and seller messaging
- Transaction tracking and status updates
- Listing reviews after completed transactions
- Listing reports and admin report moderation
- Marketplace analytics for top categories and seller performance
- Local image upload support for listings

### Frontend Coverage

The active frontend entry point is [frontend/src/main.tsx](./frontend/src/main.tsx), which renders `HokieMartAppV2`.

The current UI supports:

- Public browsing and filtering
- Member authentication
- Listing management
- Auction bids
- Fixed-price purchases
- Messaging
- Transactions and review submission
- Admin analytics and report moderation
- Local file selection and upload for listing images

## Backend API Scope

### Authentication and Users

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `GET /api/me`
- `POST /api/admin/users`

### Listings and Uploads

- `GET /api/test-db`
- `GET /api/listing-form-options`
- `GET /api/listings`
- `GET /api/listings/{listing_id}`
- `POST /api/listings`
- `PUT /api/listings/{listing_id}`
- `DELETE /api/listings/{listing_id}`
- `POST /api/uploads/listing-images`

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
2. Install backend dependencies:

```powershell
pip install -r backend/requirements.txt
```

3. Make sure your local MySQL server is running and matches the credentials in `backend/.env`.
4. Build or rebuild the schema and seed data:

```powershell
python db/run_migration.py
```

5. Start the backend from the repository root:

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

The frontend expects the backend to already be running. On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution is restricted.

## Local Image Uploads

Listing images are currently stored on disk for local development.

- Uploaded files are saved under `backend/uploads/listings/`
- FastAPI serves them from `/uploads/...`
- The database stores the resulting file URLs in `listingimage`

This is intended as a simple local-first implementation. It can later be replaced with object storage such as S3, R2, or Supabase Storage without changing the listing image concept in the UI.

## Database Notes

`db/run_migration.py` applies the SQL files in `db/` in filename order.

- `db/000_phase5_schema.sql` creates the database objects from scratch
- `db/001_phase5_seed.sql` resets and repopulates those tables with demo data

The current schema uses only two user roles:

- `member`
- `admin`

If you pulled recent changes, rerun the migration so your local enum values and seed data match the current application behavior.

## Verification

The current codebase was checked with:

```powershell
python -m py_compile backend\main.py backend\core.py backend\schemas.py backend\auth_utils.py backend\domain.py backend\routes\auth_routes.py backend\routes\listing_routes.py backend\routes\market_routes.py backend\routes\analytics_routes.py
cd frontend
.\node_modules\.bin\tsc.cmd -b
npm run lint
```

## Current Limitations

- Local image uploads are meant for development and are not a durable production storage solution
- Auction closing is still manual and not driven by a scheduled background task
- Some marketplace rules remain intentionally simplified for the course project
- Deleting seeded listings may still fail when related rows exist in `conversation`, `bid`, `transaction`, `report`, or `review`
