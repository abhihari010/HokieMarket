from typing import Any

from fastapi import APIRouter, Depends

from backend.auth_utils import get_current_user
from backend.core import open_connection

router = APIRouter()


@router.get("/api/analytics/top-categories")
def get_top_categories(current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    _ = current_user
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT c.categoryID, c.categoryName, COUNT(l.listingID) AS listingCount,
                       SUM(CASE WHEN l.status = 'sold' THEN 1 ELSE 0 END) AS soldCount,
                       COALESCE(AVG(t.finalPrice), 0) AS averageSalePrice
                FROM category AS c
                LEFT JOIN listing AS l ON l.categoryID = c.categoryID
                LEFT JOIN `transaction` AS t ON t.listingID = l.listingID
                GROUP BY c.categoryID, c.categoryName
                HAVING COUNT(l.listingID) > 0
                ORDER BY soldCount DESC, listingCount DESC, c.categoryName ASC
                """
            )
            rows = cursor.fetchall()
        for row in rows:
            row["listingCount"] = int(row["listingCount"])
            row["soldCount"] = int(row["soldCount"])
            row["averageSalePrice"] = float(row["averageSalePrice"])
        return rows
    finally:
        connection.close()


@router.get("/api/analytics/seller-performance")
def get_seller_performance(current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    _ = current_user
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT u.userID AS sellerID, u.name AS sellerName, COUNT(l.listingID) AS listingCount,
                       SUM(CASE WHEN l.status IN ('sold', 'closed') THEN 1 ELSE 0 END) AS closedListingCount,
                       COALESCE(AVG(r.rating), 0) AS averageRating,
                       COALESCE(SUM(t.finalPrice), 0) AS grossSales
                FROM `user` AS u
                LEFT JOIN listing AS l ON l.sellerID = u.userID
                LEFT JOIN review AS r ON r.listingID = l.listingID
                LEFT JOIN `transaction` AS t ON t.listingID = l.listingID
                WHERE u.role IN ('member', 'admin')
                GROUP BY u.userID, u.name
                HAVING COUNT(l.listingID) > 0
                ORDER BY grossSales DESC, averageRating DESC, sellerName ASC
                """
            )
            rows = cursor.fetchall()
        for row in rows:
            row["listingCount"] = int(row["listingCount"])
            row["closedListingCount"] = int(row["closedListingCount"])
            row["averageRating"] = float(row["averageRating"])
            row["grossSales"] = float(row["grossSales"])
        return rows
    finally:
        connection.close()
