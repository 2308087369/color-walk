from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from sqlalchemy import func as sqla_func
from typing import List, Optional
import uuid
from datetime import date
from typing import List

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import schemas
from data import model
from data.database import get_db
from utils.image_processing import detect_color_in_image
from utils.auth import get_current_user
from utils.vllm_client import generate_image_description

router = APIRouter(
    prefix="/colors",
    tags=["colors"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", response_model=schemas.ColorPaginatedResponse)
def get_colors(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = Query(None, description="Search by color name or hex code"),
    db: Session = Depends(get_db),
    current_user: model.User = Depends(get_current_user)
):
    offset = (page - 1) * size
    
    # Create a subquery to count photos per color for the current user
    photo_counts = db.query(
        model.UserPhoto.color_id,
        sqla_func.count(model.UserPhoto.id).label('photo_count')
    ).filter(
        model.UserPhoto.user_id == current_user.id
    ).group_by(model.UserPhoto.color_id).subquery()
    
    # Join Color with the subquery
    query = db.query(
        model.Color,
        sqla_func.coalesce(photo_counts.c.photo_count, 0).label('photo_count')
    ).outerjoin(
        photo_counts, model.Color.id == photo_counts.c.color_id
    )
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (model.Color.name.ilike(search_term)) | 
            (model.Color.hex_code.ilike(search_term))
        )
        
    # Order by photo_count descending (checked first), then by color ID
    query = query.order_by(
        sqla_func.coalesce(photo_counts.c.photo_count, 0).desc(),
        model.Color.id.asc()
    )
        
    total = query.count()
    results = query.offset(offset).limit(size).all()
    
    # Map results to schema (Color + photo_count)
    colors = []
    for color, count in results:
        color_dict = color.__dict__.copy()
        color_dict['photo_count'] = count
        colors.append(color_dict)
    
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": colors
    }

@router.post("/random", response_model=List[schemas.ColorResponse])
def get_random_colors(
    request: schemas.RandomColorRequest,
    db: Session = Depends(get_db),
    current_user: model.User = Depends(get_current_user)
):
    if request.count < 1:
        raise HTTPException(status_code=400, detail="Count must be at least 1")
    
    query = db.query(model.Color)
    
    # Exclude specifically requested IDs
    if request.exclude_ids:
        query = query.filter(model.Color.id.notin_(request.exclude_ids))
        
    # Exclude colors the user has already checked in (if exclude_checked is True)
    if request.exclude_checked:
        checked_color_ids = db.query(model.UserPhoto.color_id).filter(
            model.UserPhoto.user_id == current_user.id
        ).distinct()
        query = query.filter(model.Color.id.notin_(checked_color_ids))
        
    total_available = query.count()
    if total_available < request.count:
        # Fallback if not enough available
        if request.exclude_checked and total_available == 0:
            raise HTTPException(
                status_code=400, 
                detail="You have collected all colors! Try unchecking 'Exclude checked colors'."
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Not enough colors available. Requested {request.count}, available {total_available}"
            )
        
    random_colors = query.order_by(func.random()).limit(request.count).all()
    
    # 自动记录今天抽取的颜色
    today = date.today()
    for color in random_colors:
        # 检查今天是否已经记录过该颜色，避免重复记录
        existing_record = db.query(model.UserDrawnColor).filter(
            model.UserDrawnColor.user_id == current_user.id,
            model.UserDrawnColor.color_id == color.id,
            model.UserDrawnColor.date == today
        ).first()
        
        if not existing_record:
            new_record = model.UserDrawnColor(
                user_id=current_user.id,
                color_id=color.id,
                date=today
            )
            db.add(new_record)
            
    db.commit()
    
    return random_colors

@router.get("/drawn/today", response_model=List[schemas.ColorResponse])
def get_today_drawn_colors(
    db: Session = Depends(get_db),
    current_user: model.User = Depends(get_current_user)
):
    today = date.today()
    drawn_records = db.query(model.UserDrawnColor).filter(
        model.UserDrawnColor.user_id == current_user.id,
        model.UserDrawnColor.date == today
    ).all()
    
    color_ids = [record.color_id for record in drawn_records]
    if not color_ids:
        return []
        
    colors = db.query(model.Color).filter(model.Color.id.in_(color_ids)).all()
    return colors

@router.get("/public/{color_id}", response_model=schemas.ColorResponse)
def get_public_color(
    color_id: int,
    db: Session = Depends(get_db)
):
    """获取单个颜色详情，公开接口免鉴权，用于分享页面"""
    color = db.query(model.Color).filter(model.Color.id == color_id).first()
    if not color:
        raise HTTPException(status_code=404, detail="Color not found")
    return color

@router.get("/daily", response_model=schemas.DailyRecommendationResponse)
def get_daily_recommendation(
    count: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: model.User = Depends(get_current_user)
):
    today = date.today()
    
    # Check if recommendation already exists for today
    recommendation = db.query(model.DailyRecommendation).filter(
        model.DailyRecommendation.user_id == current_user.id,
        model.DailyRecommendation.date == today
    ).first()
    
    if recommendation:
        # Parse the comma-separated IDs and fetch colors
        color_ids = [int(id_str) for id_str in recommendation.color_ids.split(',')]
        # Fetch preserving order
        colors = []
        for cid in color_ids:
            color = db.query(model.Color).filter(model.Color.id == cid).first()
            if color:
                colors.append(color)
        
        return {
            "date": today.isoformat(),
            "colors": colors
        }
    
    # Generate new recommendation
    total_colors = db.query(model.Color).count()
    if total_colors < count:
        count = total_colors
        
    random_colors = db.query(model.Color).order_by(func.random()).limit(count).all()
    color_ids_str = ",".join([str(c.id) for c in random_colors])
    
    # Save to database
    new_recommendation = model.DailyRecommendation(
        user_id=current_user.id,
        date=today,
        color_ids=color_ids_str
    )
    db.add(new_recommendation)
    db.commit()
    
    return {
        "date": today.isoformat(),
        "colors": random_colors
    }

@router.post("/detect", response_model=schemas.MultipleColorDetectionResponse)
async def detect_color(
    color_id: int = Form(...),
    tolerance: int = Form(60),  # Increased default tolerance from 30 to 60
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: model.User = Depends(get_current_user)
):
    # Verify the color exists
    color = db.query(model.Color).filter(model.Color.id == color_id).first()
    if not color:
        raise HTTPException(status_code=404, detail="Color not found")
        
    results = []
    
    for file in files:
        # Verify file type
        if not file.content_type.startswith("image/"):
            continue # Skip non-image files
            
        try:
            # Read image bytes
            image_bytes = await file.read()
            
            # Detect color in image
            result = detect_color_in_image(image_bytes, color.hex_code, tolerance)
            
            saved = False
            # Threshold matches frontend: 1.0%
            if result["percentage"] >= 1.0:
                # Save the image to disk
                file_ext = os.path.splitext(file.filename)[1]
                if not file_ext:
                    file_ext = ".jpg"
                    
                unique_filename = f"{uuid.uuid4().hex}{file_ext}"
                file_path = os.path.join(UPLOAD_DIR, unique_filename)
                
                with open(file_path, "wb") as f:
                    f.write(image_bytes)
                
                # Save record to database
                relative_path = f"/uploads/{unique_filename}"
                new_photo = model.UserPhoto(
                    user_id=current_user.id,
                    color_id=color.id,
                    file_path=relative_path,
                    match_percentage=result["percentage"]
                )
                db.add(new_photo)
                
                # Automatically generate description via vLLM
                description = generate_image_description(file_path, color.name)
                if description:
                    new_photo.description = description
                
                saved = True
            
            results.append({
                "color": color,
                "found": result["percentage"] >= 1.0,
                "percentage": result["percentage"],
                "matching_pixels": result["matching_pixels"],
                "total_pixels": result["total_pixels"],
                "saved": saved,
                "description": description if saved else None
            })
            
        except Exception as e:
            print(f"Error processing file {file.filename}: {e}")
            continue
            
    db.commit()
            
    if not results:
        raise HTTPException(status_code=400, detail="No valid images processed")
        
    return {"results": results}

@router.get("/{color_id}/photos", response_model=List[schemas.UserPhotoResponse])
def get_user_color_photos(
    color_id: int,
    db: Session = Depends(get_db),
    current_user: model.User = Depends(get_current_user)
):
    photos = db.query(model.UserPhoto).filter(
        model.UserPhoto.user_id == current_user.id,
        model.UserPhoto.color_id == color_id
    ).order_by(model.UserPhoto.created_at.desc()).all()
    
    return photos

@router.post("/photos/{photo_id}/analyze")
def analyze_user_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: model.User = Depends(get_current_user)
):
    photo = db.query(model.UserPhoto).filter(
        model.UserPhoto.id == photo_id,
        model.UserPhoto.user_id == current_user.id
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    color = db.query(model.Color).filter(model.Color.id == photo.color_id).first()
    if not color:
        raise HTTPException(status_code=404, detail="Associated color not found")
        
    # Get absolute path
    file_path_on_disk = os.path.join(os.path.dirname(os.path.dirname(__file__)), photo.file_path.lstrip('/'))
    if not os.path.exists(file_path_on_disk):
        raise HTTPException(status_code=404, detail="Image file not found on server")
        
    # Generate description
    description = generate_image_description(file_path_on_disk, color.name)
    if not description:
        raise HTTPException(status_code=500, detail="Failed to generate image description")
        
    # Update database
    photo.description = description
    db.commit()
    db.refresh(photo)
    
    return {"message": "Analysis complete", "description": description}

@router.delete("/photos/{photo_id}")
def delete_user_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: model.User = Depends(get_current_user)
):
    photo = db.query(model.UserPhoto).filter(
        model.UserPhoto.id == photo_id,
        model.UserPhoto.user_id == current_user.id
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    # Optional: Delete file from disk
    try:
        file_path_on_disk = os.path.join(os.path.dirname(os.path.dirname(__file__)), photo.file_path.lstrip('/'))
        if os.path.exists(file_path_on_disk):
            os.remove(file_path_on_disk)
    except Exception as e:
        print(f"Failed to delete file from disk: {e}")
        
    db.delete(photo)
    db.commit()
    return {"message": "Photo deleted successfully"}

