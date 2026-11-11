"""
Alerts router — create / list / delete price alerts and simulate price updates.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["Alerts"])


def _dec(val):
    if isinstance(val, Decimal):
        return float(val)
    return val


def _serialise_row(row: dict) -> dict:
    return {k: _dec(v) for k, v in row.items()} if row else row


def _serialise_rows(rows: list[dict]) -> list[dict]:
    return [_serialise_row(r) for r in rows]


# ── Pydantic request bodies ──────────────────────────────────────────
class CreateAlertRequest(BaseModel):
    product_id: int
    target_price: float


class SimulatePriceUpdateRequest(BaseModel):
    listing_id: int
    new_price: float


# ── GET /api/alerts ──────────────────────────────────────────────────
@router.get("/alerts")
def get_alerts(current_user: dict = Depends(get_current_user), cursor=Depends(get_db)):
    """Return all price alerts for the current user with the current best price."""
    user_id = current_user["user_id"]
    cursor.execute(
        "SELECT pa.alert_id, pa.product_id, p.product_name, p.brand, "
        "       pa.target_price, pa.alert_status, "
        "       pa.created_date, pa.triggered_date, "
        "       MIN(sl.current_price) AS best_price "
        "FROM price_alert pa "
        "JOIN product p ON pa.product_id = p.product_id "
        "LEFT JOIN store_listing sl ON p.product_id = sl.product_id "
        "     AND sl.availability = 'IN_STOCK' "
        "WHERE pa.user_id = %s "
        "GROUP BY pa.alert_id, pa.product_id, p.product_name, p.brand, "
        "         pa.target_price, pa.alert_status, pa.created_date, pa.triggered_date "
        "ORDER BY pa.created_date DESC",
        (user_id,),
    )
    rows = cursor.fetchall()
    for r in rows:
        if r.get("created_date"):
            r["created_date"] = str(r["created_date"])
        if r.get("triggered_date"):
            r["triggered_date"] = str(r["triggered_date"])

    return {
        "status": "success",
        "data": _serialise_rows(rows),
        "message": f"{len(rows)} alert(s) found",
    }


# ── POST /api/alerts ─────────────────────────────────────────────────
@router.post("/alerts", status_code=status.HTTP_201_CREATED)
def create_alert(
    body: CreateAlertRequest,
    current_user: dict = Depends(get_current_user),
    cursor=Depends(get_db),
):
    """Create a new price alert via sp_set_price_alert."""
    # Verify product exists
    cursor.execute("SELECT product_id FROM product WHERE product_id = %s", (body.product_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    cursor.callproc(
        "sp_set_price_alert",
        (current_user["user_id"], body.product_id, Decimal(str(body.target_price))),
    )

    # Retrieve the newly created alert_id
    cursor.execute("SELECT LAST_INSERT_ID() AS alert_id")
    row = cursor.fetchone()

    return {
        "status": "success",
        "data": {
            "alert_id": row["alert_id"] if row else None,
            "product_id": body.product_id,
            "target_price": body.target_price,
        },
        "message": "Price alert created",
    }


# ── DELETE /api/alerts/{alert_id} ────────────────────────────────────
@router.delete("/alerts/{alert_id}")
def delete_alert(
    alert_id: int,
    current_user: dict = Depends(get_current_user),
    cursor=Depends(get_db),
):
    """Delete a price alert — only if it belongs to the authenticated user."""
    cursor.execute(
        "SELECT alert_id FROM price_alert WHERE alert_id = %s AND user_id = %s",
        (alert_id, current_user["user_id"]),
    )
    if not cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found or does not belong to you",
        )

    cursor.execute("DELETE FROM price_alert WHERE alert_id = %s", (alert_id,))

    return {
        "status": "success",
        "data": {"alert_id": alert_id},
        "message": "Price alert deleted",
    }


# ── POST /api/simulate/price-update ──────────────────────────────────
@router.post("/simulate/price-update")
def simulate_price_update(
    body: SimulatePriceUpdateRequest,
    current_user: dict = Depends(get_current_user),
    cursor=Depends(get_db),
):
    """Admin-only: simulate a price update to test triggers and alerts."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    # Verify listing exists
    cursor.execute(
        "SELECT listing_id FROM store_listing WHERE listing_id = %s",
        (body.listing_id,),
    )
    if not cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    cursor.callproc(
        "sp_simulate_price_update",
        (body.listing_id, Decimal(str(body.new_price))),
    )

    return {
        "status": "success",
        "data": {
            "listing_id": body.listing_id,
            "new_price": body.new_price,
        },
        "message": "Price update simulated — triggers will fire automatically",
    }
