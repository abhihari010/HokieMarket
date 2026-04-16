# Phase 6 Backend Notes

## Overview

The backend was expanded from a Phase 5 listing CRUD demo into a Phase 6 authenticated marketplace backend. This phase added secure user support, role-aware workflows, auction completion logic, messaging, reviews, reports, reporting endpoints, and a codebase refactor so the backend is easier to maintain and extend.

## Summary of All Backend Changes

### Codebase refactor

The original backend logic lived in one large file. For Phase 6, it was split into smaller modules so responsibilities are clearer.

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

### New backend capabilities

- Secure signup, login, logout, and password change
- Admin-created users
- Session-based authentication using database-backed session tokens
- Authenticated listing CRUD
- Auction listing creation support
- Auction bidding
- Auction closing and winner selection
- Fixed-price purchase flow
- Transaction status updates
- Buyer-seller messaging
- Review submission after completed transactions
- Listing report submission
- Admin report review and status updates
- Aggregated reporting endpoints for analytics

## Database Changes

Phase 6 required changes to the schema, not just new API routes.

### Changes to existing tables

#### `user`

Added:
- `passwordHash VARCHAR(255) NOT NULL`

Why:
- Passwords can no longer be hardcoded or stored outside the database.
- The backend now stores hashed passwords for signup, login, admin-created users, and password changes.

#### `listing`

Added:
- `status ENUM('active', 'sold', 'closed') NOT NULL DEFAULT 'active'`

Why:
- Phase 5 only tracked listings at a basic CRUD level.
- Phase 6 needs to know whether a listing is still available, already sold, or closed without a winner.
- This field is now used by fixed-price purchase logic, auction closing, and reporting.

### New tables

#### `usersession`

Added:
- `sessionID`
- `userID`
- `tokenHash`
- `createdAt`
- `expiresAt`
- `revokedAt`

Why:
- Supports login sessions stored in the database.
- Allows logout to revoke a session rather than relying on frontend-only state.
- Supports secure token checking for protected endpoints.

### New and updated constraints

#### `usersession`

- `UNIQUE KEY uq_usersession_token_hash (tokenHash)`

Why:
- Prevents duplicate stored session tokens.

#### `conversation`

- `UNIQUE KEY uq_conversation_listing_buyer (listingID, buyerID)`

Why:
- Prevents the same buyer from creating duplicate conversation threads for the same listing.

#### `transaction`

- `UNIQUE KEY uq_transaction_listing (listingID)`

Why:
- Ensures only one transaction exists per listing.
- Prevents duplicate purchase records for the same item.

### Seed data changes

The seed file was updated to match the new schema and workflow rules.

- Seeded users now include hashed passwords instead of missing password fields.
- A shared seeded demo password is used for testing: `HokieMarket123!`
- Listings now include `status` values such as `active`, `sold`, and `closed`.
- `usersession` is truncated during reseed.
- Auto-increment reset for `usersession` was added.

## Authentication and User Support

Phase 6 user support requirements are now backed by the database.

### Implemented endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `GET /api/me`
- `POST /api/admin/users`

### Security changes

- Passwords are hashed with PBKDF2-SHA256 before storage.
- Passwords are never stored in plaintext.
- Sessions are stored as hashed tokens in `usersession`.
- Protected endpoints require a bearer token.
- SQL injection risk is reduced by using parameterized SQL queries throughout the backend.

## Listing and Marketplace Workflow Changes

### Listing management

Listings are no longer just raw CRUD rows. They now participate in marketplace rules.

- Only authenticated users can create, edit, or delete listings.
- Sellers can only create listings under their own account.
- Sellers can only edit or delete their own listings unless an admin performs the action.
- Listings can now include image URLs.
- Listings can be filtered by category, seller, status, and auction/fixed-price type.

### Listing status usage

- `active`: available for bidding or purchase
- `sold`: already purchased or won through an auction
- `closed`: auction ended without a winning transaction or was manually closed without bids

## Auction Changes

Phase 5 intentionally avoided full auction writes. Phase 6 now supports auction workflows.

### Implemented endpoints

- `POST /api/auctions/{auction_id}/bids`
- `GET /api/auctions/{auction_id}/bids`
- `POST /api/auctions/{auction_id}/close`

### Auction bid rules

- Users cannot bid on their own auction.
- Only active auctions accept bids.
- Bids must be greater than the current highest bid or minimum price.
- Bids cannot be placed after the auction end time.

### Auction close logic

`POST /api/auctions/{auction_id}/close` closes an auction after its end time has passed.

- Only the seller or an admin can close the auction.
- If bids exist, the highest bid wins.
- Ties are broken by earliest bid timestamp because the query sorts by highest amount first, then earliest time.
- A new row is created in `transaction` for the winning bidder.
- The listing status becomes `sold`.
- If no bids exist, the listing status becomes `closed`.

## Transaction Changes

Transactions now represent real marketplace outcomes instead of just seeded demo rows.

### Implemented endpoints

- `POST /api/transactions`
- `GET /api/my-transactions`
- `PUT /api/transactions/{transaction_id}/status`

### Fixed-price purchase rules

- Only active, non-auction listings can be purchased directly.
- Users cannot buy their own listing.
- A listing can only have one transaction.
- Creating a fixed-price transaction sets the listing status to `sold`.

### Transaction status rules

Allowed transaction statuses:
- `Pending Pickup`
- `Completed`
- `Cancelled`

Rules:
- `Pending Pickup` is the initial state.
- Only the buyer, seller, or admin can update a transaction.
- Completed and cancelled transactions are terminal and cannot be changed again.
- Cancelling a fixed-price purchase returns the listing to `active`.
- Cancelling an auction-derived transaction returns the listing to `closed`.
- Completing a transaction keeps the listing in `sold`.

## Messaging Changes

The conversation and message tables are now connected to real API routes.

### Implemented endpoints

- `POST /api/conversations`
- `GET /api/conversations`
- `GET /api/conversations/{conversation_id}/messages`
- `POST /api/conversations/{conversation_id}/messages`

### Messaging rules

- Users cannot start a conversation on their own listing.
- The same buyer cannot create duplicate conversations for the same listing.
- Only the buyer and seller involved in a conversation can read or send messages in that conversation.

## Review Changes

Reviews are now tied to actual completed transactions.

### Implemented endpoints

- `POST /api/reviews`
- `GET /api/listings/{listing_id}/reviews`

### Review rules

- Only a buyer with a matching transaction can leave a review.
- The transaction must be `Completed`.
- A user can only leave one review per listing.

## Report Changes

Reports now support both submission and admin-side management.

### Implemented endpoints

- `POST /api/reports`
- `GET /api/admin/reports`
- `PUT /api/admin/reports/{report_id}`

### Report rules

- Users cannot report their own listing.
- Reports are assigned to an admin.
- Admins can change report status to:
  - `Open`
  - `Under Review`
  - `Resolved`

## Reporting and Analytics Endpoints

Two reporting endpoints were added to support the Phase 6 requirement for meaningful reports using joins and aggregation.

### `GET /api/analytics/top-categories`

Returns:
- `categoryID`
- `categoryName`
- `listingCount`
- `soldCount`
- `averageSalePrice`

Purpose:
- Shows which categories have the most listings and successful sales.
- Uses joins and aggregate functions across `category`, `listing`, and `transaction`.

### `GET /api/analytics/seller-performance`

Returns:
- `sellerID`
- `sellerName`
- `listingCount`
- `closedListingCount`
- `averageRating`
- `grossSales`

Purpose:
- Summarizes seller activity and performance.
- Uses joins and aggregate functions across `user`, `listing`, `review`, and `transaction`.

## Files Updated for Phase 6

### Backend code

- `backend/main.py`
- `backend/core.py`
- `backend/schemas.py`
- `backend/auth_utils.py`
- `backend/domain.py`
- `backend/routes/auth_routes.py`
- `backend/routes/listing_routes.py`
- `backend/routes/market_routes.py`
- `backend/routes/analytics_routes.py`
- `backend/requirements.txt`

### Database

- `db/000_phase5_schema.sql`
- `db/001_phase5_seed.sql`

### Documentation

- `README.md`
- `docs/phase6-backend.md`

## Verification

The refactored backend modules were checked with Python compilation:

```powershell
python -m py_compile backend\main.py backend\core.py backend\schemas.py backend\auth_utils.py backend\domain.py backend\routes\auth_routes.py backend\routes\listing_routes.py backend\routes\market_routes.py backend\routes\analytics_routes.py
```

This verifies syntax and import structure. End-to-end API testing against the local MySQL instance still needs to be run on the configured environment.
