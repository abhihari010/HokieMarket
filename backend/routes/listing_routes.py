from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from mysql.connector import Error

from backend.auth_utils import get_current_user
from backend.core import open_connection
from backend.domain import choose_listing_owner, ensure_listing_owner_or_admin, fetch_listing_by_id, fetch_listings, insert_listing_images, replace_listing_images, validate_auction_payload
from backend.schemas import ListingPayload

router = APIRouter()


@router.get("/api/listing-form-options")
def get_listing_form_options(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, list[dict[str, Any]]]:
    _ = current_user
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT userID, name, email FROM `user` WHERE role IN ('seller', 'admin') ORDER BY name")
            sellers = cursor.fetchall()
            cursor.execute("SELECT categoryID, categoryName FROM category ORDER BY categoryName")
            categories = cursor.fetchall()
            cursor.execute("SELECT courseID, subjectPrefix, courseNumber, title FROM course ORDER BY subjectPrefix, courseNumber")
            courses = cursor.fetchall()
        for course in courses:
            course["label"] = f'{course["subjectPrefix"]} {course["courseNumber"]} - {course["title"]}'
        return {"sellers": sellers, "categories": categories, "courses": courses}
    finally:
        connection.close()


@router.get("/api/listings")
def get_listings(search: str | None = Query(default=None), categoryID: int | None = Query(default=None, gt=0), sellerID: int | None = Query(default=None, gt=0), status_filter: str | None = Query(default=None, alias="status"), isAuction: bool | None = Query(default=None)) -> list[dict[str, Any]]:
    connection = open_connection()
    try:
        where_clauses: list[str] = []
        params: list[Any] = []
        if search:
            where_clauses.append("(l.title LIKE %s OR l.description LIKE %s)")
            wildcard = f"%{search.strip()}%"
            params.extend([wildcard, wildcard])
        if categoryID is not None:
            where_clauses.append("l.categoryID = %s")
            params.append(categoryID)
        if sellerID is not None:
            where_clauses.append("l.sellerID = %s")
            params.append(sellerID)
        if status_filter is not None:
            if status_filter not in {"active", "sold", "closed"}:
                raise HTTPException(status_code=400, detail="Status filter must be active, sold, or closed.")
            where_clauses.append("l.status = %s")
            params.append(status_filter)
        if isAuction is not None:
            where_clauses.append("l.isAuction = %s")
            params.append(int(isAuction))
        return fetch_listings(connection, where_clauses, params)
    finally:
        connection.close()


@router.get("/api/listings/{listing_id}")
def get_listing(listing_id: int) -> dict[str, Any]:
    connection = open_connection()
    try:
        listing = fetch_listing_by_id(connection, listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found.")
        return listing
    finally:
        connection.close()


@router.post("/api/listings", status_code=201)
def create_listing(payload: ListingPayload, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    validate_auction_payload(payload)
    seller_id = choose_listing_owner(current_user, payload)
    connection = open_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO listing (sellerID, categoryID, courseID, title, description, `condition`, isAuction, price, status, createdAt) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'active', UTC_TIMESTAMP())",
                (seller_id, payload.categoryID, payload.courseID, payload.title.strip(), payload.description.strip(), payload.condition.strip(), int(payload.isAuction), payload.price),
            )
            new_listing_id = cursor.lastrowid
            if payload.isAuction:
                cursor.execute(
                    "INSERT INTO auction (listingID, endTime, minimumPrice) VALUES (%s, %s, %s)",
                    (new_listing_id, payload.auctionEndTime.replace(tzinfo=None) if payload.auctionEndTime else None, payload.minimumPrice),
                )
        insert_listing_images(connection, new_listing_id, payload.imageUrls)
        connection.commit()
        listing = fetch_listing_by_id(connection, new_listing_id)
        if not listing:
            raise HTTPException(status_code=500, detail="Listing was inserted but could not be reloaded.")
        return listing
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Listing insert failed: {exc}") from exc
    finally:
        connection.close()


@router.put("/api/listings/{listing_id}")
def update_listing(listing_id: int, payload: ListingPayload, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    validate_auction_payload(payload)
    connection = open_connection()
    try:
        existing = fetch_listing_by_id(connection, listing_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Listing not found.")
        ensure_listing_owner_or_admin(current_user, existing)
        seller_id = existing["sellerID"] if current_user["role"] != "admin" or not payload.sellerID else payload.sellerID
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE listing SET sellerID = %s, categoryID = %s, courseID = %s, title = %s, description = %s, `condition` = %s, isAuction = %s, price = %s WHERE listingID = %s",
                (seller_id, payload.categoryID, payload.courseID, payload.title.strip(), payload.description.strip(), payload.condition.strip(), int(payload.isAuction), payload.price, listing_id),
            )
            cursor.execute("SELECT auctionID FROM auction WHERE listingID = %s", (listing_id,))
            auction_row = cursor.fetchone()
            if payload.isAuction:
                if auction_row:
                    cursor.execute("UPDATE auction SET endTime = %s, minimumPrice = %s WHERE listingID = %s", (payload.auctionEndTime.replace(tzinfo=None), payload.minimumPrice, listing_id))
                else:
                    cursor.execute("INSERT INTO auction (listingID, endTime, minimumPrice) VALUES (%s, %s, %s)", (listing_id, payload.auctionEndTime.replace(tzinfo=None), payload.minimumPrice))
            elif auction_row:
                cursor.execute("SELECT COUNT(*) FROM bid WHERE auctionID = %s", (auction_row[0],))
                if cursor.fetchone()[0] > 0:
                    raise HTTPException(status_code=400, detail="Auction listings with bids cannot be converted to fixed-price listings.")
                cursor.execute("DELETE FROM auction WHERE listingID = %s", (listing_id,))
        replace_listing_images(connection, listing_id, payload.imageUrls)
        connection.commit()
        updated = fetch_listing_by_id(connection, listing_id)
        if not updated:
            raise HTTPException(status_code=500, detail="Listing update completed but the row could not be reloaded.")
        return updated
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Listing update failed: {exc}") from exc
    finally:
        connection.close()


@router.delete("/api/listings/{listing_id}")
def delete_listing(listing_id: int, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    connection = open_connection()
    try:
        existing = fetch_listing_by_id(connection, listing_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Listing not found.")
        ensure_listing_owner_or_admin(current_user, existing)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM listingimage WHERE listingID = %s", (listing_id,))
            cursor.execute("SELECT auctionID FROM auction WHERE listingID = %s", (listing_id,))
            auction_row = cursor.fetchone()
            if auction_row:
                cursor.execute("SELECT COUNT(*) FROM bid WHERE auctionID = %s", (auction_row[0],))
                if cursor.fetchone()[0] > 0:
                    raise HTTPException(status_code=409, detail="Auction listings with bids cannot be deleted.")
                cursor.execute("DELETE FROM auction WHERE listingID = %s", (listing_id,))
            cursor.execute("DELETE FROM listing WHERE listingID = %s", (listing_id,))
        connection.commit()
        return {"status": "deleted", "listingID": listing_id, "title": existing["title"]}
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=409, detail=f"Listing delete failed because related rows still exist. MySQL said: {exc}") from exc
    finally:
        connection.close()
