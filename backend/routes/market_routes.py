from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from mysql.connector import Error

from backend.auth_utils import get_current_user, require_role
from backend.core import open_connection
from backend.domain import fetch_conversation_by_id, fetch_listing_by_id
from backend.schemas import BidPayload, ConversationPayload, MessagePayload, PurchasePayload, ReportPayload, ReportStatusPayload, ReviewPayload, TransactionStatusPayload

router = APIRouter()


@router.post("/api/transactions", status_code=201)
def create_transaction(payload: PurchasePayload, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    connection = open_connection()
    try:
        listing = fetch_listing_by_id(connection, payload.listingID)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found.")
        if listing["isAuction"]:
            raise HTTPException(status_code=400, detail="Auction listings must be completed through bidding.")
        if listing["status"] != "active":
            raise HTTPException(status_code=400, detail="This listing is no longer available for purchase.")
        if listing["sellerID"] == current_user["userID"]:
            raise HTTPException(status_code=400, detail="You cannot purchase your own listing.")

        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT transactionID FROM `transaction` WHERE listingID = %s", (payload.listingID,))
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail="A transaction already exists for this listing.")

            cursor.execute("INSERT INTO `transaction` (listingID, buyerID, finalPrice, status, completedAt) VALUES (%s, %s, %s, 'Pending Pickup', NULL)", (payload.listingID, current_user["userID"], listing["price"]))
            transaction_id = cursor.lastrowid
            cursor.execute("UPDATE listing SET status = 'sold' WHERE listingID = %s", (payload.listingID,))
            cursor.execute("SELECT transactionID, listingID, buyerID, finalPrice, status, completedAt FROM `transaction` WHERE transactionID = %s", (transaction_id,))
            transaction_row = cursor.fetchone()
        connection.commit()
        if not transaction_row:
            raise HTTPException(status_code=500, detail="Transaction was created but could not be reloaded.")
        transaction_row["finalPrice"] = float(transaction_row["finalPrice"])
        return transaction_row
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Transaction creation failed: {exc}") from exc
    finally:
        connection.close()


@router.get("/api/my-transactions")
def get_my_transactions(current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT t.transactionID, t.listingID, l.title, l.sellerID, l.isAuction, t.buyerID,
                       buyer.name AS buyerName, seller.name AS sellerName,
                       t.finalPrice, t.status, t.completedAt
                FROM `transaction` AS t
                JOIN listing AS l ON l.listingID = t.listingID
                JOIN `user` AS buyer ON buyer.userID = t.buyerID
                JOIN `user` AS seller ON seller.userID = l.sellerID
                WHERE t.buyerID = %s OR l.sellerID = %s
                ORDER BY t.transactionID DESC
                """,
                (current_user["userID"], current_user["userID"]),
            )
            rows = cursor.fetchall()
        for row in rows:
            row["finalPrice"] = float(row["finalPrice"])
            row["isAuction"] = bool(row["isAuction"])
        return rows
    finally:
        connection.close()


@router.put("/api/transactions/{transaction_id}/status")
def update_transaction_status(transaction_id: int, payload: TransactionStatusPayload, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT t.transactionID, t.listingID, t.buyerID, t.finalPrice, t.status, t.completedAt,
                       l.sellerID, l.isAuction
                FROM `transaction` AS t
                JOIN listing AS l ON l.listingID = t.listingID
                WHERE t.transactionID = %s
                """,
                (transaction_id,),
            )
            transaction_row = cursor.fetchone()
            if not transaction_row:
                raise HTTPException(status_code=404, detail="Transaction not found.")
            if current_user["role"] != "admin" and current_user["userID"] not in {transaction_row["buyerID"], transaction_row["sellerID"]}:
                raise HTTPException(status_code=403, detail="You do not have permission to update this transaction.")
            if transaction_row["status"] in {"Completed", "Cancelled"}:
                raise HTTPException(status_code=400, detail="Completed or cancelled transactions cannot be changed.")
            if payload.status == "Pending Pickup":
                raise HTTPException(status_code=400, detail="Pending Pickup is the initial state and cannot be set again.")

            completed_at_sql = "UTC_TIMESTAMP()" if payload.status == "Completed" else "NULL"
            cursor.execute(f"UPDATE `transaction` SET status = %s, completedAt = {completed_at_sql} WHERE transactionID = %s", (payload.status, transaction_id))

            if payload.status == "Cancelled":
                next_listing_status = "closed" if transaction_row["isAuction"] else "active"
                cursor.execute("UPDATE listing SET status = %s WHERE listingID = %s", (next_listing_status, transaction_row["listingID"]))
            elif payload.status == "Completed":
                cursor.execute("UPDATE listing SET status = 'sold' WHERE listingID = %s", (transaction_row["listingID"],))

            cursor.execute("SELECT transactionID, listingID, buyerID, finalPrice, status, completedAt FROM `transaction` WHERE transactionID = %s", (transaction_id,))
            updated = cursor.fetchone()
        connection.commit()
        if not updated:
            raise HTTPException(status_code=500, detail="Transaction status update completed but the row could not be reloaded.")
        updated["finalPrice"] = float(updated["finalPrice"])
        return updated
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Transaction update failed: {exc}") from exc
    finally:
        connection.close()


@router.post("/api/auctions/{auction_id}/bids", status_code=201)
def place_bid(auction_id: int, payload: BidPayload, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT a.auctionID, a.listingID, a.endTime, a.minimumPrice, l.sellerID, l.status FROM auction AS a JOIN listing AS l ON l.listingID = a.listingID WHERE a.auctionID = %s", (auction_id,))
            auction = cursor.fetchone()
            if not auction:
                raise HTTPException(status_code=404, detail="Auction not found.")
            if auction["sellerID"] == current_user["userID"]:
                raise HTTPException(status_code=400, detail="You cannot bid on your own auction.")
            if auction["status"] != "active":
                raise HTTPException(status_code=400, detail="This auction is not active.")
            if auction["endTime"] <= datetime.utcnow():
                raise HTTPException(status_code=400, detail="This auction has already ended.")
            cursor.execute("SELECT MAX(amount) AS highestBid FROM bid WHERE auctionID = %s", (auction_id,))
            highest_bid_row = cursor.fetchone()
            highest_bid = float(highest_bid_row["highestBid"]) if highest_bid_row["highestBid"] is not None else None
            minimum_allowed = max(float(auction["minimumPrice"]), highest_bid or 0.0)
            if payload.amount <= minimum_allowed:
                raise HTTPException(status_code=400, detail=f"Bid amount must be greater than {minimum_allowed:.2f}.")
            cursor.execute("INSERT INTO bid (auctionID, bidderID, amount, `timestamp`) VALUES (%s, %s, %s, UTC_TIMESTAMP())", (auction_id, current_user["userID"], payload.amount))
            bid_id = cursor.lastrowid
        connection.commit()
        return {"bidID": bid_id, "auctionID": auction_id, "bidderID": current_user["userID"], "amount": payload.amount}
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Bid failed: {exc}") from exc
    finally:
        connection.close()


@router.get("/api/auctions/{auction_id}/bids")
def get_bids(auction_id: int) -> list[dict[str, Any]]:
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT b.bidID, b.auctionID, b.bidderID, u.name AS bidderName, b.amount, b.`timestamp` FROM bid AS b JOIN `user` AS u ON u.userID = b.bidderID WHERE b.auctionID = %s ORDER BY b.amount DESC, b.`timestamp` ASC", (auction_id,))
            rows = cursor.fetchall()
        for row in rows:
            row["amount"] = float(row["amount"])
        return rows
    finally:
        connection.close()


@router.post("/api/auctions/{auction_id}/close")
def close_auction(auction_id: int, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT a.auctionID, a.listingID, a.endTime, a.minimumPrice, l.sellerID, l.status, l.title
                FROM auction AS a
                JOIN listing AS l ON l.listingID = a.listingID
                WHERE a.auctionID = %s
                """,
                (auction_id,),
            )
            auction = cursor.fetchone()
            if not auction:
                raise HTTPException(status_code=404, detail="Auction not found.")
            if current_user["role"] != "admin" and current_user["userID"] != auction["sellerID"]:
                raise HTTPException(status_code=403, detail="Only the seller or an admin can close this auction.")
            if auction["status"] != "active":
                raise HTTPException(status_code=400, detail="This auction is already closed.")
            if auction["endTime"] > datetime.utcnow():
                raise HTTPException(status_code=400, detail="This auction cannot be closed until the end time has passed.")

            cursor.execute("SELECT transactionID FROM `transaction` WHERE listingID = %s", (auction["listingID"],))
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail="A transaction already exists for this auction.")

            cursor.execute(
                """
                SELECT b.bidID, b.bidderID, u.name AS bidderName, b.amount, b.timestamp
                FROM bid AS b
                JOIN `user` AS u ON u.userID = b.bidderID
                WHERE b.auctionID = %s
                ORDER BY b.amount DESC, b.timestamp ASC
                LIMIT 1
                """,
                (auction_id,),
            )
            winning_bid = cursor.fetchone()

            if winning_bid:
                cursor.execute(
                    "INSERT INTO `transaction` (listingID, buyerID, finalPrice, status, completedAt) VALUES (%s, %s, %s, 'Pending Pickup', NULL)",
                    (auction["listingID"], winning_bid["bidderID"], winning_bid["amount"]),
                )
                transaction_id = cursor.lastrowid
                cursor.execute("UPDATE listing SET status = 'sold' WHERE listingID = %s", (auction["listingID"],))
                return_payload = {
                    "status": "closed_with_winner",
                    "auctionID": auction_id,
                    "listingID": auction["listingID"],
                    "title": auction["title"],
                    "winner": {
                        "bidID": winning_bid["bidID"],
                        "bidderID": winning_bid["bidderID"],
                        "bidderName": winning_bid["bidderName"],
                        "amount": float(winning_bid["amount"]),
                    },
                    "transactionID": transaction_id,
                }
            else:
                cursor.execute("UPDATE listing SET status = 'closed' WHERE listingID = %s", (auction["listingID"],))
                return_payload = {
                    "status": "closed_without_bids",
                    "auctionID": auction_id,
                    "listingID": auction["listingID"],
                    "title": auction["title"],
                    "winner": None,
                }
        connection.commit()
        return return_payload
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Auction close failed: {exc}") from exc
    finally:
        connection.close()


@router.post("/api/conversations", status_code=201)
def create_conversation(payload: ConversationPayload, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    connection = open_connection()
    try:
        listing = fetch_listing_by_id(connection, payload.listingID)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found.")
        if listing["sellerID"] == current_user["userID"]:
            raise HTTPException(status_code=400, detail="You cannot start a conversation on your own listing.")
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT conversationID FROM conversation WHERE listingID = %s AND buyerID = %s", (payload.listingID, current_user["userID"]))
            existing = cursor.fetchone()
            conversation_id = existing["conversationID"] if existing else None
            if conversation_id is None:
                cursor.execute("INSERT INTO conversation (listingID, buyerID) VALUES (%s, %s)", (payload.listingID, current_user["userID"]))
                conversation_id = cursor.lastrowid
        connection.commit()
        conversation = fetch_conversation_by_id(connection, conversation_id)
        if not conversation:
            raise HTTPException(status_code=500, detail="Conversation could not be reloaded.")
        return conversation
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Conversation creation failed: {exc}") from exc
    finally:
        connection.close()


@router.get("/api/conversations")
def get_conversations(current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT c.conversationID, c.listingID, l.title AS listingTitle, c.buyerID, l.sellerID,
                       buyer.name AS buyerName, seller.name AS sellerName,
                       (
                           SELECT m.content
                           FROM message AS m
                           WHERE m.conversationID = c.conversationID
                           ORDER BY m.timestamp DESC
                           LIMIT 1
                       ) AS latestMessage
                FROM conversation AS c
                JOIN listing AS l ON l.listingID = c.listingID
                JOIN `user` AS buyer ON buyer.userID = c.buyerID
                JOIN `user` AS seller ON seller.userID = l.sellerID
                WHERE c.buyerID = %s OR l.sellerID = %s
                ORDER BY c.conversationID DESC
                """,
                (current_user["userID"], current_user["userID"]),
            )
            return cursor.fetchall()
    finally:
        connection.close()


@router.get("/api/conversations/{conversation_id}/messages")
def get_messages(conversation_id: int, current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    connection = open_connection()
    try:
        conversation = fetch_conversation_by_id(connection, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        if current_user["userID"] not in {conversation["buyerID"], conversation["sellerID"]}:
            raise HTTPException(status_code=403, detail="You do not have access to this conversation.")
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT m.messageID, m.conversationID, m.senderID, u.name AS senderName, m.content, m.timestamp
                FROM message AS m
                JOIN `user` AS u ON u.userID = m.senderID
                WHERE m.conversationID = %s
                ORDER BY m.timestamp ASC
                """,
                (conversation_id,),
            )
            return cursor.fetchall()
    finally:
        connection.close()


@router.post("/api/conversations/{conversation_id}/messages", status_code=201)
def send_message(conversation_id: int, payload: MessagePayload, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    connection = open_connection()
    try:
        conversation = fetch_conversation_by_id(connection, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        if current_user["userID"] not in {conversation["buyerID"], conversation["sellerID"]}:
            raise HTTPException(status_code=403, detail="You do not have access to this conversation.")
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("INSERT INTO message (conversationID, senderID, content, timestamp) VALUES (%s, %s, %s, UTC_TIMESTAMP())", (conversation_id, current_user["userID"], payload.content.strip()))
            message_id = cursor.lastrowid
            cursor.execute("SELECT m.messageID, m.conversationID, m.senderID, u.name AS senderName, m.content, m.timestamp FROM message AS m JOIN `user` AS u ON u.userID = m.senderID WHERE m.messageID = %s", (message_id,))
            message = cursor.fetchone()
        connection.commit()
        if not message:
            raise HTTPException(status_code=500, detail="Message could not be reloaded.")
        return message
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Message send failed: {exc}") from exc
    finally:
        connection.close()


@router.post("/api/reviews", status_code=201)
def create_review(payload: ReviewPayload, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT transactionID, status FROM `transaction` WHERE listingID = %s AND buyerID = %s", (payload.listingID, current_user["userID"]))
            transaction_row = cursor.fetchone()
            if not transaction_row:
                raise HTTPException(status_code=400, detail="Only buyers with a recorded transaction can leave a review.")
            if transaction_row["status"] != "Completed":
                raise HTTPException(status_code=400, detail="Reviews can only be left after the transaction is completed.")
            cursor.execute("SELECT reviewID FROM review WHERE listingID = %s AND reviewerID = %s", (payload.listingID, current_user["userID"]))
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail="You have already reviewed this listing.")
            cursor.execute("INSERT INTO review (listingID, reviewerID, rating, comment, date) VALUES (%s, %s, %s, %s, UTC_TIMESTAMP())", (payload.listingID, current_user["userID"], payload.rating, payload.comment.strip()))
            review_id = cursor.lastrowid
            cursor.execute("SELECT reviewID, listingID, reviewerID, rating, comment, date FROM review WHERE reviewID = %s", (review_id,))
            review = cursor.fetchone()
        connection.commit()
        if not review:
            raise HTTPException(status_code=500, detail="Review could not be reloaded.")
        return review
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Review creation failed: {exc}") from exc
    finally:
        connection.close()


@router.get("/api/listings/{listing_id}/reviews")
def get_listing_reviews(listing_id: int) -> list[dict[str, Any]]:
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT r.reviewID, r.listingID, r.reviewerID, u.name AS reviewerName, r.rating, r.comment, r.date FROM review AS r JOIN `user` AS u ON u.userID = r.reviewerID WHERE r.listingID = %s ORDER BY r.date DESC", (listing_id,))
            return cursor.fetchall()
    finally:
        connection.close()


@router.post("/api/reports", status_code=201)
def create_report(payload: ReportPayload, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT listingID, sellerID FROM listing WHERE listingID = %s", (payload.listingID,))
            listing = cursor.fetchone()
            if not listing:
                raise HTTPException(status_code=404, detail="Listing not found.")
            if listing["sellerID"] == current_user["userID"]:
                raise HTTPException(status_code=400, detail="You cannot report your own listing.")
            cursor.execute("SELECT userID FROM `user` WHERE role = 'admin' ORDER BY userID LIMIT 1")
            admin = cursor.fetchone()
            if not admin:
                raise HTTPException(status_code=500, detail="No admin user exists to assign the report.")
            cursor.execute("INSERT INTO report (reporterID, listingID, adminID, reason, status) VALUES (%s, %s, %s, %s, 'Open')", (current_user["userID"], payload.listingID, admin["userID"], payload.reason.strip()))
            report_id = cursor.lastrowid
            cursor.execute("SELECT reportID, reporterID, listingID, adminID, reason, status FROM report WHERE reportID = %s", (report_id,))
            report = cursor.fetchone()
        connection.commit()
        if not report:
            raise HTTPException(status_code=500, detail="Report could not be reloaded.")
        return report
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Report creation failed: {exc}") from exc
    finally:
        connection.close()


@router.get("/api/admin/reports")
def get_admin_reports(current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    require_role(current_user, {"admin"})
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT r.reportID, r.listingID, l.title AS listingTitle, r.reporterID, reporter.name AS reporterName,
                       r.adminID, admin.name AS adminName, r.reason, r.status
                FROM report AS r
                JOIN listing AS l ON l.listingID = r.listingID
                JOIN `user` AS reporter ON reporter.userID = r.reporterID
                JOIN `user` AS admin ON admin.userID = r.adminID
                ORDER BY r.reportID DESC
                """
            )
            return cursor.fetchall()
    finally:
        connection.close()


@router.put("/api/admin/reports/{report_id}")
def update_report_status(report_id: int, payload: ReportStatusPayload, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    require_role(current_user, {"admin"})
    connection = open_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT reportID FROM report WHERE reportID = %s", (report_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Report not found.")
            cursor.execute("UPDATE report SET status = %s, adminID = %s WHERE reportID = %s", (payload.status, current_user["userID"], report_id))
            cursor.execute("SELECT reportID, reporterID, listingID, adminID, reason, status FROM report WHERE reportID = %s", (report_id,))
            report = cursor.fetchone()
        connection.commit()
        if not report:
            raise HTTPException(status_code=500, detail="Report could not be reloaded after update.")
        return report
    except HTTPException:
        connection.rollback()
        raise
    except Error as exc:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Report update failed: {exc}") from exc
    finally:
        connection.close()
