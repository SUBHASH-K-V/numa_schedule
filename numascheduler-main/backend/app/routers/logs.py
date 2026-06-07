from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import LogEntry
from app.schemas import LogEntryResponse

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", response_model=List[LogEntryResponse])
async def get_logs(
    level: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    query = db.query(LogEntry)
    if level:
        query = query.filter(LogEntry.level == level.upper())
    if category:
        query = query.filter(LogEntry.category == category)
    logs = query.order_by(LogEntry.timestamp.desc()).limit(limit).all()
    return logs


@router.delete("")
async def clear_logs(db: Session = Depends(get_db)):
    db.query(LogEntry).delete()
    db.commit()
    return {"status": "ok", "message": "Logs cleared"}
