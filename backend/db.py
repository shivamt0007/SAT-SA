from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./sat_sa.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_schema_columns(bind_engine):
    from sqlalchemy import text
    with bind_engine.connect() as conn:
        try:
            cols = [row[1] for row in conn.execute(text("PRAGMA table_info(flags)")).fetchall()]
            if cols and 'status' not in cols:
                conn.execute(text("ALTER TABLE flags ADD COLUMN status VARCHAR DEFAULT 'OPEN'"))
            if cols and 'auto_triaged_by' not in cols:
                conn.execute(text("ALTER TABLE flags ADD COLUMN auto_triaged_by VARCHAR"))
        except Exception:
            pass
            
        try:
            cols_ns = [row[1] for row in conn.execute(text("PRAGMA table_info(negative_space_findings)")).fetchall()]
            if cols_ns and 'status' not in cols_ns:
                conn.execute(text("ALTER TABLE negative_space_findings ADD COLUMN status VARCHAR DEFAULT 'OPEN'"))
            if cols_ns and 'auto_triaged_by' not in cols_ns:
                conn.execute(text("ALTER TABLE negative_space_findings ADD COLUMN auto_triaged_by VARCHAR"))
        except Exception:
            pass
        conn.commit()

