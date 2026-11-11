"""
Dashboard router — aggregated user dashboard data.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends

from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["Dashboard"])


def _dec(val):
    if isinstance(val, Decimal):
        return float(val)
    return val


def _serialise_row(row: dict) -> dict:
    return {k: _dec(v) for k, v in row.items()} if row else row


# ── GET /api/dashboard ───────────────────────────────────────────────
@router.get("/dashboard")
def get_dashboard(current_user: dict = Depends(get_current_user), cursor=Depends(get_db)):
    """
    Call sp_get_user_dashboard and split results into watchlist + alerts sections.
    """
    user_id = current_user["user_id"]

    cursor.callproc("sp_get_user_dashboard", (user_id,))
    rows = []
    for result in cursor.stored_results():
        rows = result.fetchall()

    watchlist_items: list[dict] = []
    alert_items: list[dict] = []

    for r in rows:
        item = _serialise_row(r)
        # Stringify dates
        for date_key in ("added_date", "triggered_date"):
            if item.get(date_key):
                item[date_key] = str(item[date_key])

        if item.get("section") == "WATCHLIST":
            watchlist_items.append(item)
        elif item.get("section") == "ALERT":
            alert_items.append(item)

    return {
        "status": "success",
        "data": {
            "user": {
                "user_id": current_user["user_id"],
                "name": current_user["name"],
                "email": current_user["email"],
            },
            "watchlist": watchlist_items,
            "alerts": alert_items,
            "summary": {
                "watchlist_count": len(watchlist_items),
                "alerts_count": len(alert_items),
                "triggered_alerts": sum(
                    1 for a in alert_items if a.get("alert_status") == "TRIGGERED"
                ),
            },
        },
        "message": "Dashboard data retrieved",
    }
