from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from app.auth.security import hash_password, verify_password
from app.core.database import db


async def get_user_by_email(email: str) -> Optional[dict]:
    return await db.db.users.find_one({"email": email})


async def get_user_by_id(user_id: str) -> Optional[dict]:
    try:
        return await db.db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None


async def create_user(email: str, password: str, name: str = "") -> dict:
    if await get_user_by_email(email):
        raise ValueError("An account with this email already exists")

    now_iso = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "email": email,
        "name": name.strip(),
        "password_hash": hash_password(password),
        "created_at": now_iso,
    }
    result = await db.db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return user_doc


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    user = await get_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        return None
    return user
