import os
from pathlib import Path
from typing import Any

import mysql.connector
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mysql.connector import Error
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).with_name(".env"))


class ListingPayload(BaseModel):
    sellerID: int = Field(..., gt=0)
    categoryID: int = Field(..., gt=0)
    courseID: int | None = Field(default=None, gt=0)
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=2000)
    condition: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., gt=0)
    isAuction: bool = False


def get_db_config() -> dict[str, Any]:
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("SQL_USER"),
        "password": os.getenv("SQL_PASSWORD"),
        "database": os.getenv("DB_NAME", "marketplacedb"),
    }


def open_connection() -> mysql.connector.MySQLConnection:
    db_config = get_db_config()
    if not db_config["user"] or not db_config["password"]:
        raise HTTPException(
            status_code=500,
            detail="Missing database credentials. Copy backend/.env.example to backend/.env and fill in local MySQL values.",
        )

    try:
        return mysql.connector.connect(**db_config)
    except Error as exc:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {exc}") from exc


def fetch_listing_by_id(connection: mysql.connector.MySQLConnection, listing_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            l.listingID,
            l.sellerID,
            u.name AS sellerName,
            l.categoryID,
            c.categoryName,
            l.courseID,
            CONCAT(cr.subjectPrefix, ' ', cr.courseNumber, ' - ', cr.title) AS courseLabel,
            l.title,
            l.description,
            l.`condition` AS listingCondition,
            l.isAuction,
            l.price,
            l.createdAt
        FROM listing AS l
        JOIN `user` AS u ON u.userID = l.sellerID
        JOIN category AS c ON c.categoryID = l.categoryID
        LEFT JOIN course AS cr ON cr.courseID = l.courseID
        WHERE l.listingID = %s
    """

    with connection.cursor(dictionary=True) as cursor:
        cursor.execute(query, (listing_id,))
        row = cursor.fetchone()

    if not row:
        return None

    row["isAuction"] = bool(row["isAuction"])
    row["price"] = float(row["price"])
    return row


app = FastAPI(title="Hokie Market API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Welcome to the Hokie Market API"}


@app.get("/api/test-db")
def test_db_connection() -> dict[str, Any]:
    connection = open_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT DATABASE();")
            db_name = cursor.fetchone()
        return {
            "status": "Success",
            "database": db_name[0] if db_name else None,
            "host": get_db_config()["host"],
            "port": get_db_config()["port"],
        }
    finally:
        connection.close()


@app.get("/api/listing-form-options")
def get_listing_form_options() -> dict[str, list[dict[str, Any]]]:
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT userID, name, email
                FROM `user`
                WHERE role = 'seller'
                ORDER BY name
                """
            )
            sellers = cursor.fetchall()

            cursor.execute(
                """
                SELECT categoryID, categoryName
                FROM category
                ORDER BY categoryName
                """
            )
            categories = cursor.fetchall()

            cursor.execute(
                """
                SELECT
                    courseID,
                    subjectPrefix,
                    courseNumber,
                    title
                FROM course
                ORDER BY subjectPrefix, courseNumber
                """
            )
            courses = cursor.fetchall()

        for course in courses:
            course["label"] = f'{course["subjectPrefix"]} {course["courseNumber"]} - {course["title"]}'

        return {
            "sellers": sellers,
            "categories": categories,
            "courses": courses,
        }
    finally:
        connection.close()


@app.get("/api/listings")
def get_listings() -> list[dict[str, Any]]:
    connection = open_connection()
    query = """
        SELECT
            l.listingID,
            l.sellerID,
            u.name AS sellerName,
            l.categoryID,
            c.categoryName,
            l.courseID,
            CONCAT(cr.subjectPrefix, ' ', cr.courseNumber, ' - ', cr.title) AS courseLabel,
            l.title,
            l.description,
            l.`condition` AS listingCondition,
            l.isAuction,
            l.price,
            l.createdAt
        FROM listing AS l
        JOIN `user` AS u ON u.userID = l.sellerID
        JOIN category AS c ON c.categoryID = l.categoryID
        LEFT JOIN course AS cr ON cr.courseID = l.courseID
        ORDER BY l.listingID DESC
    """

    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

        for row in rows:
            row["isAuction"] = bool(row["isAuction"])
            row["price"] = float(row["price"])

        return rows
    finally:
        connection.close()


@app.post("/api/listings", status_code=201)
def create_listing(payload: ListingPayload) -> dict[str, Any]:
    if payload.isAuction:
        raise HTTPException(
            status_code=400,
            detail="Auction listing creation is not included in this Phase 5 scaffold because it also requires an auction table insert.",
        )

    connection = open_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO listing (
                    sellerID,
                    categoryID,
                    courseID,
                    title,
                    description,
                    `condition`,
                    isAuction,
                    price,
                    createdAt
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    payload.sellerID,
                    payload.categoryID,
                    payload.courseID,
                    payload.title.strip(),
                    payload.description.strip(),
                    payload.condition.strip(),
                    int(payload.isAuction),
                    payload.price,
                ),
            )
            new_listing_id = cursor.lastrowid
        connection.commit()

        # TODO: verify this end-to-end against a live local MySQL instance owned by a teammate.
        listing = fetch_listing_by_id(connection, new_listing_id)
        if not listing:
            raise HTTPException(status_code=500, detail="Listing was inserted but could not be reloaded.")
        return listing
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Listing insert failed: {exc}") from exc
    finally:
        connection.close()


@app.put("/api/listings/{listing_id}")
def update_listing(listing_id: int, payload: ListingPayload) -> dict[str, Any]:
    if payload.isAuction:
        raise HTTPException(
            status_code=400,
            detail="Auction listing updates are outside the current Phase 5 CRUD scaffold.",
        )

    connection = open_connection()
    try:
        existing = fetch_listing_by_id(connection, listing_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Listing not found.")

        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE listing
                SET
                    sellerID = %s,
                    categoryID = %s,
                    courseID = %s,
                    title = %s,
                    description = %s,
                    `condition` = %s,
                    isAuction = %s,
                    price = %s
                WHERE listingID = %s
                """,
                (
                    payload.sellerID,
                    payload.categoryID,
                    payload.courseID,
                    payload.title.strip(),
                    payload.description.strip(),
                    payload.condition.strip(),
                    int(payload.isAuction),
                    payload.price,
                    listing_id,
                ),
            )
        connection.commit()

        # TODO: verify update behavior against the real local MySQL data once access is available.
        updated = fetch_listing_by_id(connection, listing_id)
        if not updated:
            raise HTTPException(status_code=500, detail="Listing update completed but the row could not be reloaded.")
        return updated
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Listing update failed: {exc}") from exc
    finally:
        connection.close()


@app.delete("/api/listings/{listing_id}")
def delete_listing(listing_id: int) -> dict[str, Any]:
    connection = open_connection()
    try:
        existing = fetch_listing_by_id(connection, listing_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Listing not found.")

        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM listing WHERE listingID = %s", (listing_id,))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Listing not found.")
        connection.commit()

        # TODO: verify delete behavior locally. Seeded listings with dependent rows may fail due to foreign-key constraints.
        return {
            "status": "deleted",
            "listingID": listing_id,
            "title": existing["title"],
        }
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Listing delete failed. The row may still have dependent records such as images, conversations, "
                f"auctions, or transactions. MySQL said: {exc}"
            ),
        ) from exc
    finally:
        connection.close()
