from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from data.database import engine
from data import model
from routers import users, colors, reports
import os
from sqlalchemy import text

# Create all tables in the database
model.Base.metadata.create_all(bind=engine)

def ensure_schema_updates():
    with engine.begin() as conn:
        # Check user_photos
        columns = conn.execute(text("PRAGMA table_info(user_photos)")).fetchall()
        names = {row[1] for row in columns}
        if "description" not in names:
            conn.execute(text("ALTER TABLE user_photos ADD COLUMN description VARCHAR"))
        if "description_status" not in names:
            conn.execute(text("ALTER TABLE user_photos ADD COLUMN description_status VARCHAR DEFAULT 'pending'"))
        if "description_error" not in names:
            conn.execute(text("ALTER TABLE user_photos ADD COLUMN description_error VARCHAR"))
            
        # Check users
        user_columns = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        user_names = {row[1] for row in user_columns}
        if "phone" not in user_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR DEFAULT '+86 173****0694'"))

ensure_schema_updates()

app = FastAPI(title="Color City API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development, in production change to specific domains like ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Mount uploads directory for static file serving
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(users.router)
app.include_router(colors.router)
app.include_router(reports.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Color City API"}
