"""
Products router — search, details, price history, categories, brands.
"""

from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import get_db

router = APIRouter(prefix="/api", tags=["Products"])


def _dec(val):
    """Convert Decimal / date / datetime to JSON-friendly types."""
    if isinstance(val, Decimal):
        return float(val)
    return val


def _serialise_row(row: dict) -> dict:
    """Ensure every value in a row dict is JSON-serialisable."""
    return {k: _dec(v) for k, v in row.items()} if row else row


def _serialise_rows(rows: list[dict]) -> list[dict]:
    return [_serialise_row(r) for r in rows]


# ── GET /api/products ────────────────────────────────────────────────
@router.get("/products")
def search_products(
    keyword: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    brand: Optional[str] = Query(None),
    cursor=Depends(get_db),
):
    """Search / list products using the sp_search_products stored procedure."""
    cursor.callproc("sp_search_products", (
        keyword,
        category_id,
        Decimal(str(min_price)) if min_price is not None else None,
        Decimal(str(max_price)) if max_price is not None else None,
        brand,
    ))
    products = []
    for result in cursor.stored_results():
        products = result.fetchall()

    return {
        "status": "success",
        "data": _serialise_rows(products),
        "message": f"{len(products)} product(s) found",
    }


# ── GET /api/products/{product_id} ───────────────────────────────────
@router.get("/products/{product_id}")
def get_product_detail(product_id: int, cursor=Depends(get_db)):
    """Full product detail: info, specs, store comparison, active offers, and deal intelligence."""

    # 1. Basic product info
    cursor.execute(
        "SELECT p.product_id, p.product_name, p.brand, p.description, "
        "       c.category_name "
        "FROM product p "
        "JOIN category c ON p.category_id = c.category_id "
        "WHERE p.product_id = %s",
        (product_id,),
    )
    product = cursor.fetchone()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # 2. Specs
    cursor.execute(
        "SELECT spec_name, spec_value FROM product_spec WHERE product_id = %s",
        (product_id,),
    )
    specs = cursor.fetchall()

    # 3. Store comparison (view)
    cursor.execute(
        "SELECT store_id, store_name, listing_id, current_price, delivery_charge, "
        "       total_price, availability, seller_name, avg_rating, review_count, "
        "       product_url, last_updated "
        "FROM v_store_comparison "
        "WHERE product_id = %s "
        "ORDER BY total_price ASC",
        (product_id,),
    )
    stores = cursor.fetchall()

    # 4. Active offers for each listing
    listing_ids = [s["listing_id"] for s in stores]
    offers_map: dict[int, list] = {}
    if listing_ids:
        format_strings = ",".join(["%s"] * len(listing_ids))
        cursor.execute(
            f"SELECT offer_id, listing_id, offer_type, description, "
            f"       valid_from, valid_until, "
            f"       coupon_code, coupon_discount_value, "
            f"       discount_percent, "
            f"       cashback_amount, max_cashback "
            f"FROM v_active_offers "
            f"WHERE listing_id IN ({format_strings})",
            tuple(listing_ids),
        )
        for offer in cursor.fetchall():
            lid = offer["listing_id"]
            offers_map.setdefault(lid, []).append(_serialise_row(offer))

    # Attach offers to each store listing
    for s in stores:
        s["offers"] = offers_map.get(s["listing_id"], [])

    # 5. Deal intelligence (stored procedure)
    cursor.callproc("sp_deal_intelligence", (product_id,))
    deal_rows = []
    for result in cursor.stored_results():
        deal_rows = result.fetchall()

    return {
        "status": "success",
        "data": {
            "product": _serialise_row(product),
            "specs": _serialise_rows(specs),
            "stores": _serialise_rows(stores),
            "deal_intelligence": _serialise_rows(deal_rows),
        },
        "message": "Product details retrieved",
    }


# ── GET /api/products/{product_id}/price-history ─────────────────────
@router.get("/products/{product_id}/price-history")
def get_price_history(
    product_id: int,
    days: int = Query(90, ge=1),
    cursor=Depends(get_db),
):
    """Return price history for every listing of the given product, grouped by store."""

    # Get listings for this product
    cursor.execute(
        "SELECT sl.listing_id, s.store_name "
        "FROM store_listing sl "
        "JOIN store s ON sl.store_id = s.store_id "
        "WHERE sl.product_id = %s",
        (product_id,),
    )
    listings = cursor.fetchall()
    if not listings:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No listings found for this product")

    history_by_store: list[dict] = []
    for listing in listings:
        cursor.callproc("sp_get_price_history", (listing["listing_id"], days))
        records = []
        for result in cursor.stored_results():
            records = result.fetchall()

        history_by_store.append({
            "listing_id": listing["listing_id"],
            "store_name": listing["store_name"],
            "history": [
                {
                    "recorded_timestamp": str(r["recorded_timestamp"]),
                    "price": float(r["price"]),
                }
                for r in records
            ],
        })

    return {
        "status": "success",
        "data": history_by_store,
        "message": "Price history retrieved",
    }


# ── GET /api/categories ──────────────────────────────────────────────
@router.get("/categories")
def get_categories(cursor=Depends(get_db)):
    """Return all categories as a nested tree (parent → children)."""
    cursor.execute(
        "SELECT category_id, category_name, description, parent_category_id "
        "FROM category ORDER BY category_name"
    )
    rows = cursor.fetchall()

    # Build lookup and tree
    by_id: dict[int, dict] = {}
    for r in rows:
        r["children"] = []
        by_id[r["category_id"]] = r

    roots: list[dict] = []
    for r in rows:
        parent = r["parent_category_id"]
        if parent and parent in by_id:
            by_id[parent]["children"].append(r)
        else:
            roots.append(r)

    return {
        "status": "success",
        "data": roots,
        "message": f"{len(rows)} category(ies) found",
    }


# ── GET /api/brands ──────────────────────────────────────────────────
@router.get("/brands")
def get_brands(cursor=Depends(get_db)):
    """Return a distinct sorted list of all product brands."""
    cursor.execute("SELECT DISTINCT brand FROM product ORDER BY brand")
    brands = [r["brand"] for r in cursor.fetchall()]
    return {
        "status": "success",
        "data": brands,
        "message": f"{len(brands)} brand(s) found",
    }
