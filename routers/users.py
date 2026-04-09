from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sqla_func
from fastapi.security import OAuth2PasswordRequestForm
from datetime import date, timedelta

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import schemas
from data import model
from data.database import get_db
from utils import auth

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

@router.post("/register", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = auth.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    new_user = model.User(username=user.username, hashed_password=hashed_password, phone=user.phone)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.get_user_by_username(db, username=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: model.User = Depends(auth.get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.UserResponse)
def update_user_me(
    user_update: schemas.UserUpdate, 
    current_user: model.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    if user_update.password:
        current_user.hashed_password = auth.get_password_hash(user_update.password)
        db.commit()
        db.refresh(current_user)
    return current_user

@router.get("/achievements", response_model=schemas.AchievementResponse)
def get_achievements(
    db: Session = Depends(get_db),
    current_user: model.User = Depends(auth.get_current_user)
):
    total_photos = db.query(sqla_func.count(model.UserPhoto.id)).filter(
        model.UserPhoto.user_id == current_user.id
    ).scalar() or 0
    total_colors = db.query(sqla_func.count(sqla_func.distinct(model.UserPhoto.color_id))).filter(
        model.UserPhoto.user_id == current_user.id
    ).scalar() or 0

    draw_dates = db.query(model.UserDrawnColor.date).filter(
        model.UserDrawnColor.user_id == current_user.id
    ).distinct().all()
    draw_date_set = {row[0] for row in draw_dates}

    streak = 0
    cursor = date.today()
    while cursor in draw_date_set:
        streak += 1
        cursor -= timedelta(days=1)

    items = [
        {
            "key": "first_checkin",
            "title": "完成首次打卡",
            "achieved": total_photos >= 1,
            "progress": min(total_photos, 1),
            "target": 1
        },
        {
            "key": "collector_10",
            "title": "解锁10种颜色",
            "achieved": total_colors >= 10,
            "progress": min(total_colors, 10),
            "target": 10
        },
        {
            "key": "collector_30",
            "title": "解锁30种颜色",
            "achieved": total_colors >= 30,
            "progress": min(total_colors, 30),
            "target": 30
        },
        {
            "key": "streak_3",
            "title": "连续抽色3天",
            "achieved": streak >= 3,
            "progress": min(streak, 3),
            "target": 3
        },
        {
            "key": "streak_7",
            "title": "连续抽色7天",
            "achieved": streak >= 7,
            "progress": min(streak, 7),
            "target": 7
        }
    ]

    total_achieved = len([item for item in items if item["achieved"]])
    return {"total_achieved": total_achieved, "items": items}
