from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional
from jose import JWTError, jwt

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import schemas
from data import model
from data.database import get_db
from utils import auth

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
)

@router.post("", response_model=schemas.ReportResponse)
async def submit_report(report: schemas.ReportCreate, request: Request, db: Session = Depends(get_db)):
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
            username: str = payload.get("sub")
            if username:
                user = auth.get_user_by_username(db, username=username)
                if user:
                    user_id = user.id
        except Exception:
            pass

    new_report = model.Report(
        user_id=user_id,
        content=report.content,
        contact=report.contact
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report
