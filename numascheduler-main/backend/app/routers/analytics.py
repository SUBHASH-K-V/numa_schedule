from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict
from app.database import get_db
from app.services.analytics_service import AnalyticsService
from app.schemas import PerformanceReport

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def get_analytics_service() -> AnalyticsService:
    return AnalyticsService()


@router.get("/report", response_model=PerformanceReport)
async def get_performance_report(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    return analytics_service.get_performance_report(db, hours)


@router.get("/cpu-usage")
async def get_cpu_usage(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    return analytics_service.get_cpu_usage_history(db, hours)


@router.get("/migration-frequency")
async def get_migration_frequency(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    return analytics_service.get_migration_frequency(db, hours)


@router.get("/numa-access")
async def get_numa_access(
    db: Session = Depends(get_db),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    return analytics_service.get_numa_access_patterns(db)


@router.get("/heatmap")
async def get_numa_heatmap(
    db: Session = Depends(get_db),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    return analytics_service.get_numa_heatmap(db)


@router.get("/efficiency")
async def get_efficiency(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    return analytics_service.get_efficiency_history(db, hours)
