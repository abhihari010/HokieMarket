from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from backend.tests.bootstrap import ensure_test_stubs

ensure_test_stubs()

from fastapi import HTTPException

from backend.routes import listing_routes
from backend.schemas import ListingPayload
from backend.tests.test_helpers import FakeConnection, FakeCursor


class AsyncUploadFile:
    def __init__(self, content_type: str, data: bytes) -> None:
        self.content_type = content_type
        self._data = data

    async def read(self) -> bytes:
        return self._data


class ListingRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_upload_listing_images_rejects_non_images(self) -> None:
        request = SimpleNamespace(base_url="http://testserver/")
        bad_file = AsyncUploadFile("text/plain", b"hello")

        with self.assertRaises(HTTPException) as ctx:
            await listing_routes.upload_listing_images(request, [bad_file], {"userID": 1})

        self.assertEqual(ctx.exception.status_code, 400)

    async def test_upload_listing_images_saves_supported_file(self) -> None:
        request = SimpleNamespace(base_url="http://testserver/")
        image_file = AsyncUploadFile("image/png", b"png-data")

        with tempfile.TemporaryDirectory() as temp_dir, patch(
            "backend.routes.listing_routes.UPLOAD_ROOT", Path(temp_dir)
        ), patch("backend.routes.listing_routes.imghdr.what", return_value="png"), patch(
            "backend.routes.listing_routes.uuid4", return_value=SimpleNamespace(hex="abc123")
        ):
            result = await listing_routes.upload_listing_images(request, [image_file], {"userID": 1})
            self.assertTrue((Path(temp_dir) / "abc123.png").exists())

        self.assertEqual(result["imageUrls"], ["http://testserver/uploads/listings/abc123.png"])

    def test_get_listings_rejects_invalid_status(self) -> None:
        with patch("backend.routes.listing_routes.open_connection", return_value=FakeConnection()):
            with self.assertRaises(HTTPException) as ctx:
                listing_routes.get_listings(status_filter="broken")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_get_listings_passes_filters_to_domain_fetch(self) -> None:
        connection = FakeConnection()
        with patch("backend.routes.listing_routes.open_connection", return_value=connection), patch(
            "backend.routes.listing_routes.fetch_listings", return_value=[{"listingID": 1}]
        ) as fetch_mock:
            result = listing_routes.get_listings(search=" bike ", categoryID=2, sellerID=3, status_filter="active", isAuction=True)

        self.assertEqual(result, [{"listingID": 1}])
        args = fetch_mock.call_args.args
        self.assertIs(args[0], connection)
        self.assertEqual(args[1], [
            "(l.title LIKE %s OR l.description LIKE %s)",
            "l.categoryID = %s",
            "l.sellerID = %s",
            "l.status = %s",
            "l.isAuction = %s",
        ])
        self.assertEqual(args[2], ["%bike%", "%bike%", 2, 3, "active", 1])

    def test_create_listing_inserts_listing_and_images(self) -> None:
        payload = ListingPayload(
            categoryID=2,
            courseID=3,
            title=" Bike ",
            description=" Great condition ",
            condition=" Used ",
            price=125.0,
            isAuction=True,
            auctionEndTime=datetime.now(timezone.utc) + timedelta(days=1),
            minimumPrice=100.0,
            imageUrls=["/a.jpg"],
        )
        current_user = {"userID": 10, "role": "member"}
        connection = FakeConnection([FakeCursor(lastrowid=77)])

        with patch("backend.routes.listing_routes.open_connection", return_value=connection), patch(
            "backend.routes.listing_routes.fetch_listing_by_id", return_value={"listingID": 77}
        ), patch("backend.routes.listing_routes.insert_listing_images") as insert_images:
            result = listing_routes.create_listing(payload, current_user)

        self.assertEqual(result, {"listingID": 77})
        insert_images.assert_called_once_with(connection, 77, ["/a.jpg"])
        self.assertTrue(connection.commit_called)

    def test_update_listing_rejects_missing_listing(self) -> None:
        payload = ListingPayload(categoryID=1, title="T", description="D", condition="C", price=10.0)
        connection = FakeConnection()
        with patch("backend.routes.listing_routes.open_connection", return_value=connection), patch(
            "backend.routes.listing_routes.fetch_listing_by_id", return_value=None
        ):
            with self.assertRaises(HTTPException) as ctx:
                listing_routes.update_listing(9, payload, {"userID": 1, "role": "admin"})

        self.assertEqual(ctx.exception.status_code, 404)
        self.assertTrue(connection.rollback_called)

    def test_delete_listing_blocks_auction_with_bids(self) -> None:
        connection = FakeConnection([FakeCursor(fetchone_values=[(4,), (2,)])])
        existing = {"listingID": 9, "sellerID": 1, "title": "Auction"}
        with patch("backend.routes.listing_routes.open_connection", return_value=connection), patch(
            "backend.routes.listing_routes.fetch_listing_by_id", return_value=existing
        ):
            with self.assertRaises(HTTPException) as ctx:
                listing_routes.delete_listing(9, {"userID": 1, "role": "member"})

        self.assertEqual(ctx.exception.status_code, 409)
        self.assertTrue(connection.rollback_called)


if __name__ == "__main__":
    unittest.main()
