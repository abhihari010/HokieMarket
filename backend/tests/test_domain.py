from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

from backend.tests.bootstrap import ensure_test_stubs

ensure_test_stubs()

from fastapi import HTTPException

from backend import domain
from backend.tests.test_helpers import FakeConnection, FakeCursor


class ListingDomainTests(unittest.TestCase):
    def test_serialize_listing_row_normalizes_numeric_fields(self) -> None:
        row = {
            "listingID": 1,
            "isAuction": 1,
            "price": "10.50",
            "minimumPrice": "8.25",
            "highestBid": "12.75",
            "bidCount": "3",
        }

        serialized = domain.serialize_listing_row(row)

        self.assertTrue(serialized["isAuction"])
        self.assertEqual(serialized["price"], 10.5)
        self.assertEqual(serialized["minimumPrice"], 8.25)
        self.assertEqual(serialized["highestBid"], 12.75)
        self.assertEqual(serialized["bidCount"], 3)
        self.assertEqual(serialized["currentPrice"], 12.75)
        self.assertEqual(serialized["imageUrls"], [])

    def test_attach_listing_images_populates_image_urls(self) -> None:
        listings = [{"listingID": 10}, {"listingID": 11}]
        cursor = FakeCursor(
            fetchall_values=[[
                {"listingID": 10, "imageURL": "/a.jpg"},
                {"listingID": 10, "imageURL": "/b.jpg"},
                {"listingID": 11, "imageURL": "/c.jpg"},
            ]]
        )
        connection = FakeConnection([cursor])

        domain.attach_listing_images(connection, listings)

        self.assertEqual(listings[0]["imageUrls"], ["/a.jpg", "/b.jpg"])
        self.assertEqual(listings[1]["imageUrls"], ["/c.jpg"])

    def test_fetch_listing_by_id_returns_first_listing(self) -> None:
        expected = {"listingID": 7}
        with patch("backend.domain.fetch_listings", return_value=[expected]) as fetch_mock:
            result = domain.fetch_listing_by_id(object(), 7)

        fetch_mock.assert_called_once()
        self.assertEqual(result, expected)

    def test_validate_auction_payload_requires_future_end_time_and_minimum(self) -> None:
        missing_fields = SimpleNamespace(isAuction=True, auctionEndTime=None, minimumPrice=None)
        with self.assertRaises(HTTPException):
            domain.validate_auction_payload(missing_fields)

        expired = SimpleNamespace(
            isAuction=True,
            auctionEndTime=datetime.now(timezone.utc) - timedelta(minutes=1),
            minimumPrice=5.0,
        )
        with self.assertRaises(HTTPException):
            domain.validate_auction_payload(expired)

    def test_choose_listing_owner_respects_admin_override(self) -> None:
        admin = {"role": "admin", "userID": 1}
        payload = SimpleNamespace(sellerID=42)
        self.assertEqual(domain.choose_listing_owner(admin, payload), 42)

    def test_choose_listing_owner_rejects_other_users_for_member(self) -> None:
        member = {"role": "member", "userID": 1}
        payload = SimpleNamespace(sellerID=42)
        with self.assertRaises(HTTPException) as ctx:
            domain.choose_listing_owner(member, payload)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_ensure_listing_owner_or_admin_rejects_non_owner(self) -> None:
        with self.assertRaises(HTTPException):
            domain.ensure_listing_owner_or_admin({"role": "member", "userID": 2}, {"sellerID": 1})

    def test_insert_and_replace_listing_images_trim_empty_values(self) -> None:
        insert_cursor = FakeCursor()
        delete_cursor = FakeCursor()
        connection = FakeConnection([delete_cursor, insert_cursor])

        domain.replace_listing_images(connection, 8, [" /x.jpg ", "", " /y.jpg "])

        self.assertEqual(delete_cursor.executed[0][1], (8,))
        self.assertEqual(
            insert_cursor.executemany_calls[0][1],
            [(8, "/x.jpg"), (8, "/y.jpg")],
        )

    def test_fetch_conversation_by_id_returns_row(self) -> None:
        row = {"conversationID": 5, "listingID": 8}
        connection = FakeConnection([FakeCursor(fetchone_values=[row])])

        result = domain.fetch_conversation_by_id(connection, 5)

        self.assertEqual(result, row)


if __name__ == "__main__":
    unittest.main()
