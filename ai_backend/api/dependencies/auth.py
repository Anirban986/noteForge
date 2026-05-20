from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt
import config

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="login"
)

def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    try:
        payload = jwt.decode(
            token,
            config.JWT_SECRET,
            algorithms=["HS256"]
        )

        return {
            "id": payload["user_id"]
        }

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )