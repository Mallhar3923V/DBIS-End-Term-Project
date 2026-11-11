"""
Watchlist router — add / remove / list watched products (all protected).
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/watchlist", tags=["Watchlist"])


def _dec(val):
    if isinstance(val, Decimal):
        return float(val)
    return val


def _serialise_row(row: dict) -> dict:
    return {k: _dec(v) for k, v in row.items()} if row else row


def _serialise_rows(rows: list[dict]) -> list[dict]:
    return [_serialise_row(r) for r in rows]


# ── GET /api/watchlist ───────────────────────────────────────────────
@router.get("")
def get_watchlist(current_user: dict = Depends(get_current_user), cursor=Depends(get_db)):
    """Return the current user's watchlist with the best (lowest) current price per product."""
    user_id = current_user["user_id"]
    cursor.execute(
        "SELECT p.product_id, p.product_name, p.brand, "
        "       w.added_date, "
        "       MIN(sl.current_price) AS best_price "
        "FROM watches w "
        "JOIN product p ON w.product_id = p.product_id "
        "LEFT JOIN store_listing sl ON p.product_id = sl.product_id "
        "     AND sl.availability = 'IN_STOCK' "
        "WHERE w.user_id = %s "
        "GROUP BY p.product_id, p.product_name, p.brand, w.added_date "
        "ORDER BY w.added_date DESC",
        (user_id,),
    )
    rows = cursor.fetchall()
    # Stringify dates for JSON
    for r in rows:
        if r.get("added_date"):
            r["added_date"] = str(r["added_date"])

    return {
        "status": "success",
        "data": _serialise_rows(rows),
        "message": f"{len(rows)} item(s) in watchlist",
    }


# ── POST /api/watchlist/{product_id} ─────────────────────────────────
@router.post("/{product_id}", status_code=status.HTTP_201_CREATED)
def add_to_watchlist(
    product_id: int,
    current_user: dict = Depends(get_current_user),
    cursor=Depends(get_db),
):
    """Add a product to the user's watchlist via sp_add_to_watchlist."""
    # Verify product exists
    cursor.execute("SELECT product_id FROM product WHERE product_id = %s", (product_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    cursor.callproc("sp_add_to_watchlist", (current_user["user_id"], product_id))

    return {
        "status": "success",
        "data": {"product_id": product_id},
        "message": "Product added to watchlist",
    }


# ── DELETE /api/watchlist/{product_id} ────────────────────────────────
@router.delete("/{product_id}")
def remove_from_watchlist(
    product_id: int,
    current_user: dict = Depends(get_current_user),
    cursor=Depends(get_db),
):
    """Remove a product from the user's watchlist via sp_remove_from_watchlist."""
    cursor.callproc("sp_remove_from_watchlist", (current_user["user_id"], product_id))

    return {
        "status": "success",
        "data": {"product_id": product_id},
        "message": "Product removed from watchlist",
    }
