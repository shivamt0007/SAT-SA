import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .db import engine, ensure_schema_columns, SessionLocal
from .models.orm import Base, BatchRecord, CSEFeatures, AlertRecord
from .routers import ingest, analyse, entities

# Create DB tables on startup
Base.metadata.create_all(bind=engine)
ensure_schema_columns(engine)

app = FastAPI(
    title="SAT-SA API",
    description="Supervisory Analytics Tool for SOC Assessment",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api", tags=["ingest"])
app.include_router(analyse.router, prefix="/api", tags=["analyse"])
app.include_router(entities.router, prefix="/api", tags=["entities"])
app.include_router(ingest.router, prefix="/api", tags=["ingest"])
app.include_router(analyse.router, prefix="/api", tags=["analyse"])
app.include_router(entities.router, prefix="/api", tags=["entities"])


@app.get("/api/batches")
def get_batches():
    db = SessionLocal()

    try:
        batches = (
            db.query(BatchRecord)
            .order_by(BatchRecord.created_at.desc())
            .all()
        )

        result = []

        for batch in batches:
            cse_count = (
                db.query(CSEFeatures)
                .filter(CSEFeatures.batch_id == batch.id)
                .count()
            )

            alert_count = (
                db.query(AlertRecord)
                .filter(AlertRecord.batch_id == batch.id)
                .count()
            )

            result.append({
                "batch_id": batch.id,
                "created_at": batch.created_at,
                "status": batch.status,
                "cse_count": cse_count,
                "alert_count": alert_count,
            })

        return result

    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "service": "SAT-SA"}

@app.get("/health")
def health():
    return {"status": "ok", "service": "SAT-SA"}

from fastapi.responses import JSONResponse, FileResponse

# Serve built React frontend
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")
assets_dir = os.path.join(static_dir, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # If file exists in static_dir (e.g. vite.svg, favicon.ico), serve it
    target_file = os.path.join(static_dir, full_path)
    if full_path and os.path.isfile(target_file):
        return FileResponse(target_file)
    # Otherwise fallback to index.html for React Router
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({"status": "ok", "service": "SAT-SA API"})
