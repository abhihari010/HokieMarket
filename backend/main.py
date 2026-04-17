from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import os

from backend.routes.analytics_routes import router as analytics_router
from backend.routes.auth_routes import router as auth_router
from backend.routes.listing_routes import router as listing_router
from backend.routes.market_routes import router as market_router

app = FastAPI(title="Hokie Market API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(listing_router)
app.include_router(market_router)
app.include_router(analytics_router)
