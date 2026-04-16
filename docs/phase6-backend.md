# Phase 6 Backend Notes

## What Changed

The backend was expanded from a Phase 5 listing CRUD demo into a Phase 6 authenticated marketplace backend. The codebase was also refactored so routing, database access, schemas, authentication helpers, and shared marketplace logic are separated into multiple files under `backend/`.

## Backend Structure

```text
backend/
|-- main.py
|-- core.py
|-- schemas.py
|-- auth_utils.py
|-- domain.py
`-- routes/
    |-- auth_routes.py
    |-- listing_routes.py
    |-- market_routes.py
    `-- analytics_routes.py
```

## Implemented Phase 6 Backend Features

- Secure signup, login, logout, and password change
- Admin-created users
- Hashed password storage in the database
- Session tokens stored in `usersession`
- Authenticated listing CRUD
- Auction bidding and manual auction closing with winner selection
- Fixed-price purchases and transaction status updates
- Messaging between buyers and sellers
- Review submission after completed transactions
- Listing report submission and admin report status updates
- Aggregated analytics endpoints for category and seller reports

## Auction Closing Logic

`POST /api/auctions/{auction_id}/close` closes an auction after its end time has passed.

- If bids exist, the highest bid wins.
- Ties are broken by earliest bid timestamp because the bids are ordered by highest amount and then earliest timestamp.
- The winner is stored as a new row in `transaction`.
- The listing status becomes `sold`.
- If no bids exist, the listing status becomes `closed`.

## Transaction Rules

- Fixed-price purchases only work on active, non-auction listings.
- Users cannot purchase their own listing.
- Only one transaction is allowed per listing.
- Only pending transactions can move to `Completed` or `Cancelled`.
- Completed and cancelled transactions are terminal states.

## Report Management

- Regular authenticated users can submit listing reports.
- Admin users can view all reports.
- Admin users can update report status through `PUT /api/admin/reports/{report_id}`.

## Reporting Endpoints

- `GET /api/analytics/top-categories`
- `GET /api/analytics/seller-performance`

These endpoints use joins and aggregate functions instead of direct raw table reads, so they are appropriate to show in the Phase 6 report as meaningful application reports.
