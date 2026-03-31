import os
import sys

# Ensure root directory can be imported
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from data.database import SessionLocal, engine
from data import model

# Ensure tables are created
model.Base.metadata.create_all(bind=engine)

def init_db():
    db = SessionLocal()
    try:
        # Check if colors already exist
        if db.query(model.Color).count() > 0:
            print("Database already contains colors. Skipping initialization.")
            return

        # Read from root directory
        filepath = os.path.join(os.path.dirname(os.path.dirname(__file__)), "color_chinese.md")
        if not os.path.exists(filepath):
            print(f"Error: {filepath} not found.")
            return

        with open(filepath, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f if line.strip()]

        print(f"Read {len(lines)} lines from file")
        
        colors = []
        name = None
        
        for line in lines:
            if line.startswith("#"):
                hex_code = line
                if name:
                    color = model.Color(name=name, hex_code=hex_code, created_by="system")
                    colors.append(color)
                    name = None
            else:
                name = line

        if colors:
            db.add_all(colors)
            db.commit()
            print(f"Successfully inserted {len(colors)} colors into the database.")
        else:
            print("No valid colors found in the file.")
            
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
