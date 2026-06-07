from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import (
    ThreadMetric,
    MigrationEvent,
    SchedulerDecision,
    SystemMetric,
    NumaNodeMetric,
    LogEntry,
)
from app.schemas import PerformanceReport


class AnalyticsService:
    def __init__(self):
        pass

    def get_performance_report(
        self, db: Session, hours: int = 24
    ) -> PerformanceReport:
        since = datetime.utcnow() - timedelta(hours=hours)

        migrations = (
            db.query(MigrationEvent)
            .filter(MigrationEvent.timestamp >= since)
            .all()
        )

        total = len(migrations)
        successful = sum(1 for m in migrations if m.success)
        failed = total - successful

        avg_time = (
            sum(m.migration_time_ms for m in migrations) / total
            if total > 0
            else 0
        )
        avg_gain = (
            sum(m.estimated_gain for m in migrations) / total
            if total > 0
            else 0
        )

        metrics = (
            db.query(ThreadMetric)
            .filter(ThreadMetric.timestamp >= since)
            .all()
        )
        total_local = sum(m.local_access_count for m in metrics)
        total_remote = sum(m.remote_access_count for m in metrics)
        avg_remote = (
            sum(m.remote_access_ratio for m in metrics) / len(metrics)
            if metrics
            else 0
        )

        latest_system = (
            db.query(SystemMetric)
            .order_by(SystemMetric.timestamp.desc())
            .first()
        )
        efficiency = latest_system.scheduler_efficiency if latest_system else 85.0

        return PerformanceReport(
            total_migrations=total,
            successful_migrations=successful,
            failed_migrations=failed,
            avg_migration_time_ms=round(avg_time, 2),
            avg_estimated_gain=round(avg_gain, 2),
            total_local_accesses=total_local,
            total_remote_accesses=total_remote,
            avg_remote_access_ratio=round(avg_remote, 4),
            scheduler_efficiency=efficiency,
            period_start=since,
            period_end=datetime.utcnow(),
        )

    def get_cpu_usage_history(
        self, db: Session, hours: int = 24
    ) -> List[Dict]:
        since = datetime.utcnow() - timedelta(hours=hours)
        metrics = (
            db.query(SystemMetric)
            .filter(SystemMetric.timestamp >= since)
            .order_by(SystemMetric.timestamp.asc())
            .all()
        )
        return [
            {
                "timestamp": m.timestamp.isoformat(),
                "cpu_percent": m.cpu_percent,
                "used_memory": m.used_memory,
                "total_memory": m.total_memory,
            }
            for m in metrics
        ]

    def get_migration_frequency(
        self, db: Session, hours: int = 24
    ) -> List[Dict]:
        since = datetime.utcnow() - timedelta(hours=hours)
        events = (
            db.query(MigrationEvent)
            .filter(MigrationEvent.timestamp >= since)
            .order_by(MigrationEvent.timestamp.asc())
            .all()
        )

        buckets = {}
        for event in events:
            key = event.timestamp.strftime("%Y-%m-%d %H:00")
            if key not in buckets:
                buckets[key] = 0
            buckets[key] += 1

        return [
            {"time": k, "count": v} for k, v in sorted(buckets.items())
        ]

    def get_numa_access_patterns(
        self, db: Session
    ) -> List[Dict]:
        latest = (
            db.query(ThreadMetric)
            .order_by(ThreadMetric.timestamp.desc())
            .limit(200)
            .all()
        )
        local = sum(m.local_access_count for m in latest)
        remote = sum(m.remote_access_count for m in latest)
        return [
            {"name": "Local Access", "value": local},
            {"name": "Remote Access", "value": remote},
        ]

    def get_numa_heatmap(self, db: Session) -> List[Dict]:
        nodes = (
            db.query(NumaNodeMetric)
            .order_by(NumaNodeMetric.timestamp.desc())
            .limit(10)
            .all()
        )

        seen = set()
        heatmap = []
        for m in nodes:
            if m.node_id not in seen:
                seen.add(m.node_id)
                heatmap.append({
                    "node": m.node_id,
                    "load": m.node_load,
                    "memory_used": m.used_memory,
                    "memory_total": m.total_memory,
                    "active_threads": m.active_threads,
                    "cpu_count": m.cpu_count,
                })
        return heatmap

    def get_efficiency_history(
        self, db: Session, hours: int = 24
    ) -> List[Dict]:
        since = datetime.utcnow() - timedelta(hours=hours)
        metrics = (
            db.query(SystemMetric)
            .filter(SystemMetric.timestamp >= since)
            .order_by(SystemMetric.timestamp.asc())
            .all()
        )
        return [
            {
                "timestamp": m.timestamp.isoformat(),
                "efficiency": m.scheduler_efficiency,
            }
            for m in metrics
        ]
