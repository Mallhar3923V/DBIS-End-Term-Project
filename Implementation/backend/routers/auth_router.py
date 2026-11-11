"""
Authentication router — register, login, and profile endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from mysql.connector import Error as MySQLError

from database import get_db
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Request / Response models ─────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ── POST /api/auth/register ──────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, cursor=Depends(get_db)):
    # Check if email already exists
    cursor.execute("SELECT user_id FROM users WHERE email = %s", (body.email,))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    hashed = hash_password(body.password)
    try:
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
            (body.name, body.email, hashed),
        )
        # Get the auto-generated user_id
        cursor.execute("SELECT LAST_INSERT_ID() AS user_id")
        row = cursor.fetchone()
        user_id = row["user_id"]
    except MySQLError as exc:
        raise HTTPException(status_code=500, detail=f"Registration failed: {exc}") from exc

    token = create_access_token({"user_id": user_id, "email": body.email, "role": "USER"})
    return {
        "status": "success",
        "data": {
            "user_id": user_id,
            "name": body.name,
            "email": body.email,
            "role": "USER",
            "token": token,
        },
        "message": "Registration successful",
    }


# ── POST /api/auth/login ─────────────────────────────────────────────
@router.post("/login")
def login(body: LoginRequest, cursor=Depends(get_db)):
    cursor.execute(
        "SELECT user_id, name, email, password_hash, role, account_status "
        "FROM users WHERE email = %s",
        (body.email,),
    )
    user = cursor.fetchone()
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if user["account_status"] != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is blocked",
        )

    token = create_access_token({
        "user_id": user["user_id"],
        "email": user["email"],
        "role": user["role"],
    })
    return {
        "status": "success",
        "data": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "token": token,
        },
        "message": "Login successful",
    }


# ── GET /api/auth/me ─────────────────────────────────────────────────
@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    # Convert date objects to strings for JSON serialization
    user_data = {**current_user}
    if user_data.get("registration_date"):
        user_data["registration_date"] = str(user_data["registration_date"])
    return {
        "status": "success",
        "data": user_data,
        "message": "User profile retrieved",
    }
