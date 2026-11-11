"""
FastAPI application entry-point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth_router, products_router, deals_router, watchlist_router, alerts_router, dashboard_router

app = FastAPI(
    title="Price Comparison & Deal Intelligence API",
    version="1.0.0",
    description="Backend API for comparing product prices across stores, tracking deals, and managing watchlists & price alerts.",
)

# ── CORS (allow everything during development) ───────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ─────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(products_router.router)
app.include_router(deals_router.router)
app.include_router(watchlist_router.router)
app.include_router(alerts_router.router)
app.include_router(dashboard_router.router)


# ── Root health-check ────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status": "success",
        "message": "Price Comparison & Deal Intelligence API is running",
        "version": "1.0.0",
    }
