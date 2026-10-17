import logging

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import get_current_user
from app.auth.models import LoginRequest, SignupRequest, TokenResponse, UserResponse
from app.auth.security import create_access_token
from app.auth.services import authenticate_user, create_user

logger = logging.getLogger(__name__)

router = APIRouter()


def _user_response(user: dict) -> UserResponse:
    return UserResponse(id=str(user["_id"]), email=user["email"], name=user.get("name", ""))


@router.post("/auth/signup", response_model=TokenResponse, status_code=201, summary="Create a new account")
async def signup(request: SignupRequest):
    try:
        user = await create_user(request.email, request.password, request.name)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    token = create_access_token(str(user["_id"]))
    return TokenResponse(access_token=token, user=_user_response(user))


@router.post("/auth/login", response_model=TokenResponse, summary="Log in with email and password")
async def login(request: LoginRequest):
    user = await authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token(str(user["_id"]))
    return TokenResponse(access_token=token, user=_user_response(user))


@router.get("/auth/me", response_model=UserResponse, summary="Get the current authenticated user")
async def get_me(current_user: dict = Depends(get_current_user)):
    return _user_response(current_user)
