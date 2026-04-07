from sqlalchemy import create_engine, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from app.core.config import settings

os.makedirs("data", exist_ok=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db():
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    if 'portfolios' in existing_tables:
        columns = [c['name'] for c in inspector.get_columns('portfolios')]
        with engine.connect() as conn:
            if 'buy_date' not in columns:
                conn.execute("ALTER TABLE portfolios ADD COLUMN buy_date TIMESTAMP")
            if 'fee' not in columns:
                conn.execute("ALTER TABLE portfolios ADD COLUMN fee FLOAT DEFAULT 0")
            if 'stock_name' not in columns:
                conn.execute("ALTER TABLE portfolios ADD COLUMN stock_name VARCHAR(100)")
            conn.commit()
    
    Base.metadata.create_all(bind=engine)


init_db()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()