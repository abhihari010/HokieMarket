from datetime import datetime
from typing import Any

import mysql.connector
from fastapi import HTTPException

from backend.auth_utils import require_role


def serialize_listing_row(row: dict[str, Any]) -> dict[str, Any]:
    highest_bid = row.get("highestBid")
    minimum_price = row.get("minimumPrice")
    row["isAuction"] = bool(row["isAuction"])
    row["price"] = float(row["price"])
    row["minimumPrice"] = float(minimum_price) if minimum_price is not None else None
    row["highestBid"] = float(highest_bid) if highest_bid is not None else None
    row["bidCount"] = int(row.get("bidCount") or 0)
    row["currentPrice"] = float(highest_bid) if highest_bid is not None else float(minimum_price if minimum_price is not None else row["price"])
    row["imageUrls"] = []
    return row


def attach_listing_images(connection: mysql.connector.MySQLConnection, listings: list[dict[str, Any]]) -> None:
    if not listings:
        return
    listing_ids = [listing["listingID"] for listing in listings]
    placeholders = ", ".join(["%s"] * len(listing_ids))
    image_map = {listing_id: [] for listing_id in listing_ids}
    with connection.cursor(dictionary=True) as cursor:
        cursor.execute(f"SELECT listingID, imageURL FROM listingimage WHERE listingID IN ({placeholders}) ORDER BY imageID", tuple(listing_ids))
        for row in cursor.fetchall():
            image_map[row["listingID"]].append(row["imageURL"])
    for listing in listings:
        listing["imageUrls"] = image_map.get(listing["listingID"], [])


def fetch_listings(connection: mysql.connector.MySQLConnection, where_clauses: list[str] | None = None, params: list[Any] | None = None) -> list[dict[str, Any]]:
    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    query = f"""
        SELECT
            l.listingID, l.sellerID, u.name AS sellerName, l.categoryID, c.categoryName, l.courseID,
            CASE WHEN cr.courseID IS NULL THEN NULL ELSE CONCAT(cr.subjectPrefix, ' ', cr.courseNumber, ' - ', cr.title) END AS courseLabel,
            l.title, l.description, l.`condition` AS listingCondition, l.isAuction, l.price, l.status, l.createdAt,
            a.auctionID, a.endTime AS auctionEndTime, a.minimumPrice,
            (SELECT MAX(b2.amount) FROM bid AS b2 WHERE b2.auctionID = a.auctionID) AS highestBid,
            (SELECT COUNT(*) FROM bid AS b3 WHERE b3.auctionID = a.auctionID) AS bidCount
        FROM listing AS l
        JOIN `user` AS u ON u.userID = l.sellerID
        JOIN category AS c ON c.categoryID = l.categoryID
        LEFT JOIN course AS cr ON cr.courseID = l.courseID
        LEFT JOIN auction AS a ON a.listingID = l.listingID
        {where_sql}
        ORDER BY l.listingID DESC
    """
    with connection.cursor(dictionary=True) as cursor:
        cursor.execute(query, tuple(params or []))
        rows = [serialize_listing_row(row) for row in cursor.fetchall()]
    attach_listing_images(connection, rows)
    return rows


def fetch_listing_by_id(connection: mysql.connector.MySQLConnection, listing_id: int) -> dict[str, Any] | None:
    listings = fetch_listings(connection, ["l.listingID = %s"], [listing_id])
    return listings[0] if listings else None


def validate_auction_payload(payload: Any) -> None:
    if payload.isAuction:
        if payload.auctionEndTime is None or payload.minimumPrice is None:
            raise HTTPException(status_code=400, detail="Auction listings require auctionEndTime and minimumPrice.")
        if payload.auctionEndTime <= datetime.now(payload.auctionEndTime.tzinfo):
            raise HTTPException(status_code=400, detail="Auction end time must be in the future.")


def choose_listing_owner(user: dict[str, Any], payload: Any) -> int:
    if user["role"] == "admin":
        return payload.sellerID or user["userID"]
    require_role(user, {"seller"})
    if payload.sellerID and payload.sellerID != user["userID"]:
        raise HTTPException(status_code=403, detail="Sellers can only create listings under their own account.")
    return user["userID"]


def ensure_listing_owner_or_admin(user: dict[str, Any], listing: dict[str, Any]) -> None:
    if user["role"] == "admin":
        return
    if listing["sellerID"] != user["userID"]:
        raise HTTPException(status_code=403, detail="Only the listing owner or an admin can modify this listing.")


def insert_listing_images(connection: mysql.connector.MySQLConnection, listing_id: int, image_urls: list[str]) -> None:
    cleaned_urls = [url.strip() for url in image_urls if url.strip()]
    if not cleaned_urls:
        return
    with connection.cursor() as cursor:
        cursor.executemany("INSERT INTO listingimage (listingID, imageURL) VALUES (%s, %s)", [(listing_id, url) for url in cleaned_urls])


def replace_listing_images(connection: mysql.connector.MySQLConnection, listing_id: int, image_urls: list[str]) -> None:
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM listingimage WHERE listingID = %s", (listing_id,))
    insert_listing_images(connection, listing_id, image_urls)


def fetch_conversation_by_id(connection: mysql.connector.MySQLConnection, conversation_id: int) -> dict[str, Any] | None:
    with connection.cursor(dictionary=True) as cursor:
        cursor.execute(
            """
            SELECT c.conversationID, c.listingID, c.buyerID, l.sellerID, l.title AS listingTitle,
                   buyer.name AS buyerName, seller.name AS sellerName
            FROM conversation AS c
            JOIN listing AS l ON l.listingID = c.listingID
            JOIN `user` AS buyer ON buyer.userID = c.buyerID
            JOIN `user` AS seller ON seller.userID = l.sellerID
            WHERE c.conversationID = %s
            """,
            (conversation_id,),
        )
        return cursor.fetchone()
