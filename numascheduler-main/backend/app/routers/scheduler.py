from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.services.scheduler_service import SchedulerService
from app.services.monitor_service import MonitorService
from app.schemas import (
    SchedulerDecisionResponse,
    MigrationEventResponse,
    MigrateRequest,
    SetAffinityRequest,
    SchedulerConfig,
)
from app.models import SchedulerDecision, MigrationEvent, ThreadMetric

router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])


def get_scheduler_service() -> SchedulerService:
    from app.main import get_scheduler_service as gss
    return gss()


def get_monitor_service() -> MonitorService:
    from app.main import get_monitor_service as gms
    return gms()


@router.get("/decisions", response_model=List[SchedulerDecisionResponse])
async def get_decisions(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    decisions = (
        db.query(SchedulerDecision)
        .order_by(SchedulerDecision.timestamp.desc())
        .limit(limit)
        .all()
    )
    return decisions


@router.get("/migrations", response_model=List[MigrationEventResponse])
async def get_migrations(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    events = (
        db.query(MigrationEvent)
        .order_by(MigrationEvent.timestamp.desc())
        .limit(limit)
        .all()
    )
    return events


@router.post("/evaluate")
async def evaluate_threads(
    db: Session = Depends(get_db),
    scheduler_service: SchedulerService = Depends(get_scheduler_service),
    monitor_service: MonitorService = Depends(get_monitor_service),
):
    metrics = monitor_service.get_latest_thread_metrics(db)
    decisions = []
    for metric in metrics[:20]:
        decision = scheduler_service.analyze_thread(metric, db)
        decisions.append(
            {
                "tid": decision.tid,
                "decision": decision.decision,
                "reason": decision.reason,
            }
        )
    return {"evaluated": len(decisions), "decisions": decisions}


@router.post("/migrate", response_model=MigrationEventResponse)
async def manual_migrate(
    req: MigrateRequest,
    db: Session = Depends(get_db),
    scheduler_service: SchedulerService = Depends(get_scheduler_service),
):
    try:
        event = scheduler_service.manual_migrate(
            req.pid, req.tid, req.target_node, req.target_cpu, db
        )
        return event
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/affinity")
async def set_affinity(
    req: SetAffinityRequest,
    scheduler_service: SchedulerService = Depends(get_scheduler_service),
):
    success = scheduler_service.set_affinity(req.pid, req.tid, req.cpu_mask)
    return {"success": success}


@router.get("/config", response_model=SchedulerConfig)
async def get_config(
    scheduler_service: SchedulerService = Depends(get_scheduler_service),
):
    config = scheduler_service.get_config()
    return SchedulerConfig(**config)


@router.put("/config", response_model=SchedulerConfig)
async def update_config(
    config: SchedulerConfig,
    scheduler_service: SchedulerService = Depends(get_scheduler_service),
    monitor_service: MonitorService = Depends(get_monitor_service),
):
    scheduler_service.update_config(
        threshold=config.remote_access_threshold,
        cooldown=config.migration_cooldown_seconds,
        auto_migration=config.auto_migration_enabled,
        simulation_mode=config.simulation_mode,
    )
    monitor_service.set_simulation_mode(config.simulation_mode)
    return config
