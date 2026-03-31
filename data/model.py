from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from data.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    recommendations = relationship("DailyRecommendation", back_populates="user")
    photos = relationship("UserPhoto", back_populates="user")
    drawn_colors = relationship("UserDrawnColor", back_populates="user")

class Color(Base):
    __tablename__ = "colors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    hex_code = Column(String, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_by = Column(String, default="system")
    
    photos = relationship("UserPhoto", back_populates="color")

class DailyRecommendation(Base):
    __tablename__ = "daily_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    # Storing a comma-separated list of color IDs
    color_ids = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="recommendations")

class UserPhoto(Base):
    __tablename__ = "user_photos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    color_id = Column(Integer, ForeignKey("colors.id"), index=True, nullable=False)
    file_path = Column(String, nullable=False)
    match_percentage = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    description_status = Column(String, nullable=False, default="pending")
    description_error = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="photos")
    color = relationship("Color", back_populates="photos")

class UserDrawnColor(Base):
    __tablename__ = "user_drawn_colors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    color_id = Column(Integer, ForeignKey("colors.id"), index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="drawn_colors")
    color = relationship("Color")
