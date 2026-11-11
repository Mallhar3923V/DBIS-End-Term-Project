"""
Deals router — top deals and deal intelligence.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import get_db

router = APIRouter(prefix="/api/deals", tags=["Deals"])


def _dec(val):
    if isinstance(val, Decimal):
        return float(val)
    return val


def _serialise_row(row: dict) -> dict:
    return {k: _dec(v) for k, v in row.items()} if row else row


def _serialise_rows(rows: list[dict]) -> list[dict]:
    return [_serialise_row(r) for r in rows]


# ── GET /api/deals ───────────────────────────────────────────────────
@router.get("")
def top_deals(limit: int = Query(20, ge=1, le=100), cursor=Depends(get_db)):
    """Return top deals using the sp_top_deals stored procedure."""
    cursor.callproc("sp_top_deals", (limit,))
    deals = []
    for result in cursor.stored_results():
        deals = result.fetchall()

    return {
        "status": "success",
        "data": _serialise_rows(deals),
        "message": f"{len(deals)} deal(s) found",
    }


# ── GET /api/deals/intelligence/{product_id} ─────────────────────────
@router.get("/intelligence/{product_id}")
def deal_intelligence(product_id: int, cursor=Depends(get_db)):
    """Deal intelligence for a single product via sp_deal_intelligence."""
    # Verify product exists
    cursor.execute("SELECT product_id FROM product WHERE product_id = %s", (product_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    cursor.callproc("sp_deal_intelligence", (product_id,))
    rows = []
    for result in cursor.stored_results():
        rows = result.fetchall()

    return {
        "status": "success",
        "data": _serialise_rows(rows),
        "message": f"Deal intelligence for product {product_id}",
    }
