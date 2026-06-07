from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.services.monitor_service import MonitorService
from app.schemas import ThreadMetricResponse

router = APIRouter(prefix="/api/threads", tags=["threads"])


def get_monitor_service() -> MonitorService:
    from app.main import get_monitor_service as gms
    return gms()


@router.get("", response_model=List[ThreadMetricResponse])
async def get_threads(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    node: Optional[int] = None,
    db: Session = Depends(get_db),
    monitor_service: MonitorService = Depends(get_monitor_service),
):
    metrics = monitor_service.get_latest_thread_metrics(db)
    if status:
        metrics = [m for m in metrics if m.status == status]
    if node is not None:
        metrics = [m for m in metrics if m.current_node == node]
    return metrics[skip : skip + limit]


@router.get("/{tid}", response_model=ThreadMetricResponse)
async def get_thread(
    tid: int,
    db: Session = Depends(get_db),
    monitor_service: MonitorService = Depends(get_monitor_service),
):
    from app.models import ThreadMetric

    metric = (
        db.query(ThreadMetric)
        .filter(ThreadMetric.tid == tid)
        .order_by(ThreadMetric.timestamp.desc())
        .first()
    )
    return metric
