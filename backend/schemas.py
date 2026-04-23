from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SignupPayload(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    phoneNo: str = Field(..., min_length=7, max_length=32)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(..., pattern="^(member)$")


class LoginPayload(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class ChangePasswordPayload(BaseModel):
    currentPassword: str = Field(..., min_length=8, max_length=128)
    newPassword: str = Field(..., min_length=8, max_length=128)


class AdminCreateUserPayload(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    phoneNo: str = Field(..., min_length=7, max_length=32)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(..., pattern="^(member|admin)$")


class ListingPayload(BaseModel):
    sellerID: int | None = Field(default=None, gt=0)
    categoryID: int = Field(..., gt=0)
    courseID: int | None = Field(default=None, gt=0)
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=2000)
    condition: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., gt=0)
    isAuction: bool = False
    auctionEndTime: datetime | None = None
    minimumPrice: float | None = Field(default=None, gt=0)
    imageUrls: list[str] = Field(default_factory=list)


class PurchasePayload(BaseModel):
    listingID: int = Field(..., gt=0)


class BidPayload(BaseModel):
    amount: float = Field(..., gt=0)


class ConversationPayload(BaseModel):
    listingID: int = Field(..., gt=0)


class MessagePayload(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class ReviewPayload(BaseModel):
    listingID: int = Field(..., gt=0)
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=1, max_length=2000)


class ReportPayload(BaseModel):
    listingID: int = Field(..., gt=0)
    reason: str = Field(..., min_length=1, max_length=2000)


class TransactionStatusPayload(BaseModel):
    status: str = Field(..., pattern="^(Pending Pickup|Completed|Cancelled)$")


class ReportStatusPayload(BaseModel):
    status: str = Field(..., pattern="^(Open|Under Review|Resolved)$")
