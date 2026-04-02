from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from sqlalchemy import func as sqla_func
from typing import List, Optional
import uuid
from datetime import date
import sys
import os
import io
import unicodedata
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import schemas
from data import model
from data.database import get_db, SessionLocal
from utils.image_processing import detect_color_in_image
from utils.auth import get_current_user
from utils.vllm_client import generate_image_description

router = APIRouter(
    prefix="/colors",
    tags=["colors"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def generate_description_task(photo_id: int, file_path: str, color_name: str):
    db = SessionLocal()
    try:
        photo = db.query(model.UserPhoto).filter(model.UserPhoto.id == photo_id).first()
        if not photo:
            return
        description = generate_image_description(file_path, color_name)
        if description:
            photo.description = description
            photo.description_status = "completed"
            photo.description_error = None
        else:
            photo.description_status = "failed"
            photo.description_error = "描述生成失败"
        db.commit()
    except Exception as exc:
        photo = db.query(model.UserPhoto).filter(model.UserPhoto.id == photo_id).first()
        if photo:
            photo.description_status = "failed"
            photo.description_error = str(exc)
            db.commit()
    finally:
        db.close()

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

@router.get("/my/spectrum", response_model=schemas.SpectrumResponse)
def get_my_spectrum(
    db: Session = Depends(get_db),
    current_user: model.User = Depends(get_current_user)
):
    rows = db.query(
        model.Color,
        sqla_func.count(model.UserPhoto.id).label("photo_count"),
        sqla_func.min(model.UserPhoto.created_at).label("first_checkin_at"),
        sqla_func.max(model.UserPhoto.created_at).label("last_checkin_at")
    ).join(
        model.UserPhoto, model.UserPhoto.color_id == model.Color.id
    ).filter(
        model.UserPhoto.user_id == current_user.id
    ).group_by(
        model.Color.id
    ).order_by(
        sqla_func.count(model.UserPhoto.id).desc(),
        sqla_func.max(model.UserPhoto.created_at).desc()
    ).all()

    total_photos = db.query(sqla_func.count(model.UserPhoto.id)).filter(
        model.UserPhoto.user_id == current_user.id
    ).scalar() or 0

    items = []
    for color, photo_count, first_checkin_at, last_checkin_at in rows:
        color_dict = color.__dict__.copy()
        color_dict["photo_count"] = photo_count
        items.append({
            "color": color_dict,
            "photo_count": photo_count,
            "first_checkin_at": first_checkin_at,
            "last_checkin_at": last_checkin_at
        })

    return {
        "total_colors_checked": len(rows),
        "total_photos": total_photos,
        "items": items
    }

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

@router.get("/public/photos/{photo_id}", response_model=schemas.PublicPhotoShareResponse)
def get_public_photo_share(
    photo_id: int,
    db: Session = Depends(get_db)
):
    photo = db.query(model.UserPhoto).filter(model.UserPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    color = db.query(model.Color).filter(model.Color.id == photo.color_id).first()
    if not color:
        raise HTTPException(status_code=404, detail="Associated color not found")

    color_dict = color.__dict__.copy()
    color_dict["photo_count"] = 0
    return {
        "id": photo.id,
        "file_path": photo.file_path,
        "match_percentage": photo.match_percentage,
        "description": photo.description,
        "created_at": photo.created_at,
        "color": color_dict
    }

@router.get("/public/photos/{photo_id}/poster")
def download_public_photo_poster(
    photo_id: int,
    db: Session = Depends(get_db)
):
    photo = db.query(model.UserPhoto).filter(model.UserPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    color = db.query(model.Color).filter(model.Color.id == photo.color_id).first()
    if not color:
        raise HTTPException(status_code=404, detail="Associated color not found")

    file_path_on_disk = os.path.join(os.path.dirname(os.path.dirname(__file__)), photo.file_path.lstrip('/'))
    if not os.path.exists(file_path_on_disk):
        raise HTTPException(status_code=404, detail="Image file not found on server")

    try:
        from PIL import Image, ImageDraw, ImageFont
    except Exception:
        raise HTTPException(status_code=500, detail="Pillow is required for poster generation")

    def load_font(size: int):
        candidates = [
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
        for path in candidates:
            if os.path.exists(path):
                return ImageFont.truetype(path, size=size)
        return ImageFont.load_default()

    def load_emoji_font(size: int):
        candidates = [
            "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",
            "/usr/share/fonts/truetype/ancient-scripts/Symbola_hint.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
        for path in candidates:
            if os.path.exists(path):
                return ImageFont.truetype(path, size=size)
        return None

    def is_emoji_char(ch: str) -> bool:
        cp = ord(ch)
        return (
            0x1F300 <= cp <= 0x1FAFF
            or 0x2600 <= cp <= 0x27BF
            or 0xFE00 <= cp <= 0xFE0F
            or cp == 0x200D
        )

    def display_units(text: str) -> int:
        total = 0
        for ch in text:
            if is_emoji_char(ch):
                total += 2
            else:
                total += 2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1
        return total

    def wrap_text_units(text: str, limit: int) -> List[str]:
        lines: List[str] = []
        current = ""
        current_units = 0
        for ch in text:
            unit = 2 if is_emoji_char(ch) or unicodedata.east_asian_width(ch) in ("W", "F") else 1
            if current and current_units + unit > limit:
                lines.append(current)
                current = ch
                current_units = unit
            else:
                current += ch
                current_units += unit
        if current:
            lines.append(current)
        return lines

    def draw_mixed_line(draw_ctx, x: int, y: int, text: str, base_font, emoji_font, fill: str):
        cursor_x = x
        idx = 0
        while idx < len(text):
            ch = text[idx]
            use_emoji = emoji_font is not None and is_emoji_char(ch)
            font = emoji_font if use_emoji else base_font
            try:
                if use_emoji:
                    draw_ctx.text((cursor_x, y), ch, font=font, embedded_color=True)
                else:
                    draw_ctx.text((cursor_x, y), ch, fill=fill, font=font)
            except TypeError:
                draw_ctx.text((cursor_x, y), ch, fill=fill, font=font)
            bbox = draw_ctx.textbbox((cursor_x, y), ch, font=font)
            width = (bbox[2] - bbox[0]) if bbox else max(16, int(display_units(ch) * 18))
            cursor_x += width
            idx += 1

    poster_w, poster_h = 1080, 1920
    poster = Image.new("RGB", (poster_w, poster_h), "#0F1116")
    draw = ImageDraw.Draw(poster)

    hex_value = color.hex_code.upper()
    color_rgb = tuple(int(hex_value.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    for i in range(420):
        alpha = i / 420
        mix = tuple(int((1 - alpha) * 16 + alpha * c) for c in color_rgb)
        draw.rectangle([0, i, poster_w, i + 1], fill=mix)
    draw.rectangle([0, 420, poster_w, poster_h], fill="#0F1116")

    source = Image.open(file_path_on_disk).convert("RGB")
    target_w, target_h = 920, 1050
    source.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
    card_x = (poster_w - target_w) // 2
    card_y = 110
    draw.rounded_rectangle([card_x - 14, card_y - 14, card_x + target_w + 14, card_y + target_h + 14], radius=36, fill="#1A1D24")
    image_x = card_x + (target_w - source.width) // 2
    image_y = card_y + (target_h - source.height) // 2
    poster.paste(source, (image_x, image_y))

    meta_top = 1240
    draw.rounded_rectangle([64, meta_top, poster_w - 64, poster_h - 96], radius=36, fill="#171A22")
    swatch_box = [108, meta_top + 54, 296, meta_top + 242]
    draw.rounded_rectangle(swatch_box, radius=22, fill=color.hex_code)
    draw.rounded_rectangle(swatch_box, radius=22, outline="#E8ECF2", width=2)

    title_font = load_font(62)
    sub_font = load_font(34)
    body_font = load_font(36)
    emoji_font = load_emoji_font(36)
    brand_font = load_font(30)

    draw.text((350, meta_top + 56), color.name, fill="#F5F7FA", font=title_font)
    draw.text((350, meta_top + 138), color.hex_code.upper(), fill="#C7CDD8", font=sub_font)

    description = (photo.description or f"这是我在色彩之城打卡的「{color.name}」瞬间。").strip()
    wrapped = wrap_text_units(description, limit=20)[:4]
    text_y = meta_top + 250
    for line in wrapped:
        draw_mixed_line(draw, 100, text_y, line, body_font, emoji_font, "#E7EBF2")
        text_y += 54

    footer = f"匹配度 {photo.match_percentage:.1f}%  ·  ColorWalk 色彩之城"
    draw.text((100, poster_h - 150), footer, fill="#98A2B3", font=brand_font)

    buffer = io.BytesIO()
    poster.save(buffer, format="PNG")
    buffer.seek(0)
    filename = f"colorwalk-share-{photo.id}.png"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(buffer, media_type="image/png", headers=headers)

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
    tolerance: int = Form(60),
    crop_x: Optional[float] = Form(None),
    crop_y: Optional[float] = Form(None),
    crop_w: Optional[float] = Form(None),
    crop_h: Optional[float] = Form(None),
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: model.User = Depends(get_current_user)
):
    color = db.query(model.Color).filter(model.Color.id == color_id).first()
    if not color:
        raise HTTPException(status_code=404, detail="Color not found")

    results = []

    for file in files:
        if not file.content_type.startswith("image/"):
            continue

        try:
            image_bytes = await file.read()
            result = detect_color_in_image(
                image_bytes,
                color.hex_code,
                tolerance,
                crop_x=crop_x,
                crop_y=crop_y,
                crop_w=crop_w,
                crop_h=crop_h
            )

            saved = False
            description = None
            if result["percentage"] >= 1.0:
                file_ext = os.path.splitext(file.filename)[1]
                if not file_ext:
                    file_ext = ".jpg"

                unique_filename = f"{uuid.uuid4().hex}{file_ext}"
                file_path = os.path.join(UPLOAD_DIR, unique_filename)

                with open(file_path, "wb") as f:
                    f.write(image_bytes)

                relative_path = f"/uploads/{unique_filename}"
                new_photo = model.UserPhoto(
                    user_id=current_user.id,
                    color_id=color.id,
                    file_path=relative_path,
                    match_percentage=result["percentage"],
                    description_status="pending"
                )
                db.add(new_photo)
                db.flush()
                if background_tasks is not None:
                    background_tasks.add_task(generate_description_task, new_photo.id, file_path, color.name)
                saved = True

            results.append({
                "color": color,
                "found": result["percentage"] >= 1.0,
                "percentage": result["percentage"],
                "matching_pixels": result["matching_pixels"],
                "total_pixels": result["total_pixels"],
                "saved": saved,
                "description": description,
                "matched_by": result["matched_by"],
                "failure_reasons": result["failure_reasons"] if not saved else []
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

    data = []
    for photo in photos:
        data.append({
            "id": photo.id,
            "color_id": photo.color_id,
            "file_path": photo.file_path,
            "match_percentage": photo.match_percentage,
            "description": photo.description,
            "description_status": photo.description_status or "pending",
            "description_error": photo.description_error,
            "created_at": photo.created_at
        })
    return data

@router.post("/photos/{photo_id}/analyze")
def analyze_user_photo(
    photo_id: int,
    background_tasks: BackgroundTasks,
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
        
    file_path_on_disk = os.path.join(os.path.dirname(os.path.dirname(__file__)), photo.file_path.lstrip('/'))
    if not os.path.exists(file_path_on_disk):
        raise HTTPException(status_code=404, detail="Image file not found on server")

    photo.description_status = "pending"
    photo.description_error = None
    db.commit()
    background_tasks.add_task(generate_description_task, photo.id, file_path_on_disk, color.name)
    return {"message": "Analysis queued", "status": "pending"}

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
