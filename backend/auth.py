import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field, field_validator

from db import USER_TABLES, db

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    # Fine for local development, but every restart logs everyone out.
    JWT_SECRET = secrets.token_urlsafe(48)
    print("WARNING: JWT_SECRET is not set; using a temporary secret. Set it in .env.")

JWT_ALGORITHM = "HS256"
TOKEN_LIFETIME = timedelta(days=7)

# Used so a login for an unknown email takes as long as one with a wrong password.
_DUMMY_HASH = bcrypt.hashpw(b"not-a-real-password", bcrypt.gensalt()).decode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "iat": now, "exp": now + TOKEN_LIFETIME},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


bearer = HTTPBearer(auto_error=False)


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict:
    """FastAPI dependency: the logged-in user, or a 401."""
    unauthorized = HTTPException(
        status_code=401,
        detail="Please log in to continue.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized

    with db() as cur:
        cur.execute("SELECT id, name, email FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
    if user is None:
        raise unauthorized
    return dict(user)


# ---------- Routes ----------

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Please enter your name")
        return v

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, v: str) -> str:
        if len(v.encode()) > 72:
            raise ValueError("Password must be at most 72 characters")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


def auth_response(user: dict) -> dict:
    return {
        "token": create_token(user["id"]),
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    }


@router.post("/register")
def register(body: RegisterIn):
    email = body.email.lower()
    try:
        with db() as cur:
            cur.execute("SELECT COUNT(*) AS n FROM users")
            is_first_user = cur.fetchone()["n"] == 0
            cur.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id, name, email",
                (body.name, email, hash_password(body.password)),
            )
            user = dict(cur.fetchone())
            # Data created before accounts existed belongs to nobody; hand it to
            # the first person who signs up so it doesn't disappear.
            if is_first_user:
                for table in USER_TABLES:
                    cur.execute(f"UPDATE {table} SET user_id = %s WHERE user_id IS NULL", (user["id"],))
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="An account with this email already exists. Try logging in.")
    return auth_response(user)


@router.post("/login")
def login(body: LoginIn):
    with db() as cur:
        cur.execute("SELECT id, name, email, password_hash FROM users WHERE email = %s", (body.email.lower(),))
        user = cur.fetchone()
    if user is None:
        verify_password(body.password, _DUMMY_HASH)
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return auth_response(dict(user))


@router.get("/me")
def me(user: dict = Depends(current_user)):
    return user
