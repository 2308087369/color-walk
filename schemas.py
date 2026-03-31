from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ColorBase(BaseModel):
    name: str
    hex_code: str

class ColorResponse(ColorBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str
    photo_count: Optional[int] = 0

    class Config:
        from_attributes = True

class ColorPaginatedResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[ColorResponse]

class RandomColorRequest(BaseModel):
    count: int = 1
    exclude_ids: Optional[List[int]] = []
    exclude_checked: Optional[bool] = True
    
class RecordDrawnColorRequest(BaseModel):
    color_id: int

class ColorDetectionResponse(BaseModel):
    color: ColorResponse
    found: bool
    percentage: float
    matching_pixels: int
    total_pixels: int
    saved: bool = False
    description: Optional[str] = None

class MultipleColorDetectionResponse(BaseModel):
    results: List[ColorDetectionResponse]

class UserPhotoResponse(BaseModel):
    id: int
    color_id: int
    file_path: str
    match_percentage: float
    description: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class DailyRecommendationResponse(BaseModel):
    date: str
    colors: List[ColorResponse]


