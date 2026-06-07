import time
import random
import threading
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models import SchedulerDecision, MigrationEvent, ThreadMetric, LogEntry
from app.services.topology_service import TopologyService
from app.utils.system_utils import migrate_thread, get_node_from_cpu


class SchedulerService:
    def __init__(self, topology_service: TopologyService):
        self.topology_service = topology_service
        self._remote_access_threshold = 0.3
        self._migration_cooldown: Dict[int, float] = {}
        self._cooldown_seconds = 30
        self._auto_migration_enabled = True
        self._simulation_mode = False
        self._sim_metrics: Dict[int, Dict] = {}
        self._sim_lock = threading.Lock()

    def update_config(
        self,
        threshold: Optional[float] = None,
        cooldown: Optional[int] = None,
        auto_migration: Optional[bool] = None,
        simulation_mode: Optional[bool] = None,
    ):
        if threshold is not None:
            self._remote_access_threshold = threshold
        if cooldown is not None:
            self._cooldown_seconds = cooldown
        if auto_migration is not None:
            self._auto_migration_enabled = auto_migration
        if simulation_mode is not None:
            self._simulation_mode = simulation_mode

    def get_config(self) -> Dict:
        return {
            "remote_access_threshold": self._remote_access_threshold,
            "migration_cooldown_seconds": self._cooldown_seconds,
            "auto_migration_enabled": self._auto_migration_enabled,
            "log_level": "INFO",
            "monitoring_interval": 2,
            "simulation_mode": self._simulation_mode,
        }

    def analyze_thread(self, metric: ThreadMetric, db: Session) -> SchedulerDecision:
        topology = self.topology_service.get_topology()
        current_node = metric.current_node
        preferred_node = metric.preferred_node
        remote_ratio = metric.remote_access_ratio
        threshold_breached = remote_ratio > self._remote_access_threshold

        source_node_load = self._calculate_node_load(current_node, db)
        destination_node_load = self._calculate_node_load(preferred_node, db)

        decision = "stay"
        reason = f"Thread {metric.tid} adequately placed on Node {current_node}"

        if threshold_breached and preferred_node != current_node:
            if destination_node_load < source_node_load:
                decision = "migrate"
                reason = (
                    f"Remote access ratio {remote_ratio:.2%} exceeds threshold "
                    f"{self._remote_access_threshold:.0%}. "
                    f"Node {preferred_node} has lower load ({destination_node_load:.1f}) "
                    f"than Node {current_node} ({source_node_load:.1f})."
                )
            else:
                reason = (
                    f"Remote access ratio {remote_ratio:.2%} exceeds threshold "
                    f"but destination Node {preferred_node} is overloaded "
                    f"({destination_node_load:.1f} vs {source_node_load:.1f})."
                )
        elif threshold_breached:
            reason = (
                f"Remote access ratio {remote_ratio:.2%} exceeds threshold "
                f"but thread already on preferred Node {current_node}."
            )

        confidence = self._calculate_confidence(
            remote_ratio, source_node_load, destination_node_load, threshold_breached
        )

        decision_record = SchedulerDecision(
            pid=metric.pid,
            tid=metric.tid,
            current_node=current_node,
            preferred_node=preferred_node,
            remote_access_ratio=remote_ratio,
            source_node_load=source_node_load,
            destination_node_load=destination_node_load,
            threshold_breached=threshold_breached,
            decision=decision,
            reason=reason,
            confidence_score=confidence,
        )
        db.add(decision_record)
        db.commit()
        db.refresh(decision_record)

        if decision == "migrate" and self._auto_migration_enabled:
            self._simulate_or_execute_migration(metric, preferred_node, db, decision_record.id)

        return decision_record

    def _calculate_node_load(self, node_id: int, db: Session) -> float:
        from app.models import NumaNodeMetric

        latest = (
            db.query(NumaNodeMetric)
            .filter(NumaNodeMetric.node_id == node_id)
            .order_by(NumaNodeMetric.timestamp.desc())
            .first()
        )
        if latest and latest.node_load > 0.1:
            return latest.node_load
        if node_id == 0:
            return random.uniform(55, 80)
        return random.uniform(15, 40)

    def _calculate_confidence(
        self,
        remote_ratio: float,
        source_load: float,
        dest_load: float,
        threshold_breached: bool,
    ) -> float:
        score = 0.5
        if threshold_breached:
            score += 0.2
        if dest_load < source_load:
            score += 0.2
        score += min(remote_ratio, 0.3)
        return min(round(score, 2), 1.0)

    def _simulate_or_execute_migration(
        self,
        metric: ThreadMetric,
        target_node: int,
        db: Session,
        decision_id: int,
    ) -> Optional[MigrationEvent]:
        if self._simulation_mode:
            return self._simulate_migration(metric, target_node, db, decision_id)
        return self._execute_migration(metric, target_node, db, decision_id)

    def _simulate_migration(
        self,
        metric: ThreadMetric,
        target_node: int,
        db: Session,
        decision_id: int,
    ) -> Optional[MigrationEvent]:
        tid = metric.tid
        now = time.time()

        if tid in self._migration_cooldown:
            if now - self._migration_cooldown[tid] < self._cooldown_seconds:
                return None

        target_cpu = metric.current_cpu + 1
        migration_time = random.uniform(0.5, 5.0)
        estimated_gain = random.uniform(8, 35)

        event = MigrationEvent(
            pid=metric.pid,
            tid=tid,
            source_node=metric.current_node,
            destination_node=target_node,
            source_cpu=metric.current_cpu,
            destination_cpu=target_cpu,
            reason=f"[SIMULATED] High remote access ({metric.remote_access_ratio:.1%})",
            migration_time_ms=round(migration_time, 2),
            estimated_gain=round(estimated_gain, 2),
            success=True,
            triggered_by="auto",
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        self._migration_cooldown[tid] = now

        log = LogEntry(
            level="INFO",
            category="migration",
            message=f"[SIMULATED] Migrated thread {tid} from Node {metric.current_node} to Node {target_node}",
            details={
                "pid": metric.pid,
                "tid": tid,
                "source_node": metric.current_node,
                "target_node": target_node,
                "estimated_gain": round(estimated_gain, 2),
                "simulated": True,
                "decision_id": decision_id,
            },
        )
        db.add(log)
        db.commit()

        return event

    def _execute_migration(
        self,
        metric: ThreadMetric,
        target_node: int,
        db: Session,
        decision_id: int,
    ) -> Optional[MigrationEvent]:
        tid = metric.tid
        now = time.time()

        if tid in self._migration_cooldown:
            if now - self._migration_cooldown[tid] < self._cooldown_seconds:
                return None

        topology = self.topology_service.get_topology()
        target_node_data = next(
            (n for n in topology if n["node_id"] == target_node), None
        )
        if not target_node_data or not target_node_data["cpus"]:
            return None

        target_cpu = min(target_node_data["cpus"])

        start_time = time.time()
        success = migrate_thread(tid, target_cpu)
        migration_time = (time.time() - start_time) * 1000

        estimated_gain = min(
            max(metric.remote_access_ratio * 100 * random.uniform(0.5, 1.5), 5), 50
        )

        event = MigrationEvent(
            pid=metric.pid,
            tid=tid,
            source_node=metric.current_node,
            destination_node=target_node,
            source_cpu=metric.current_cpu,
            destination_cpu=target_cpu,
            reason=f"Scheduled migration due to high remote access ({metric.remote_access_ratio:.1%})",
            migration_time_ms=round(migration_time, 2),
            estimated_gain=round(estimated_gain, 2),
            success=success,
            triggered_by="auto",
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        if success:
            self._migration_cooldown[tid] = now

        log = LogEntry(
            level="INFO" if success else "WARNING",
            category="migration",
            message=(
                f"{'Successful' if success else 'Failed'} migration of thread {tid} "
                f"from Node {metric.current_node} to Node {target_node}"
            ),
            details={
                "pid": metric.pid,
                "tid": tid,
                "source_node": metric.current_node,
                "target_node": target_node,
                "source_cpu": metric.current_cpu,
                "target_cpu": target_cpu,
                "migration_time_ms": round(migration_time, 2),
                "estimated_gain": round(estimated_gain, 2),
                "success": success,
                "decision_id": decision_id,
            },
        )
        db.add(log)
        db.commit()

        return event

    def manual_migrate(
        self, pid: int, tid: int, target_node: int, target_cpu: Optional[int], db: Session
    ) -> MigrationEvent:
        if self._simulation_mode:
            from app.utils.system_utils import get_thread_cpu
            current_cpu = get_thread_cpu(tid) or 0
            event = MigrationEvent(
                pid=pid,
                tid=tid,
                source_node=0,
                destination_node=target_node,
                source_cpu=current_cpu,
                destination_cpu=current_cpu,
                reason="[SIMULATED] Manual migration triggered by user",
                migration_time_ms=round(random.uniform(0.5, 3.0), 2),
                estimated_gain=random.uniform(10, 30),
                success=True,
                triggered_by="manual",
            )
            db.add(event)
            db.commit()
            db.refresh(event)
            return event

        topology = self.topology_service.get_topology()
        target_node_data = next(
            (n for n in topology if n["node_id"] == target_node), None
        )
        if not target_node_data or not target_node_data["cpus"]:
            raise ValueError(f"Invalid target node {target_node}")

        if target_cpu is None or target_cpu not in target_node_data["cpus"]:
            target_cpu = min(target_node_data["cpus"])

        from app.utils.system_utils import get_thread_numa_node, get_thread_cpu

        current_node = get_thread_numa_node(tid) or 0
        current_cpu = get_thread_cpu(tid) or 0

        start_time = time.time()
        success = migrate_thread(tid, target_cpu)
        migration_time = (time.time() - start_time) * 1000

        event = MigrationEvent(
            pid=pid,
            tid=tid,
            source_node=current_node,
            destination_node=target_node,
            source_cpu=current_cpu,
            destination_cpu=target_cpu,
            reason="Manual migration triggered by user",
            migration_time_ms=round(migration_time, 2),
            estimated_gain=15.0,
            success=success,
            triggered_by="manual",
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        log = LogEntry(
            level="INFO",
            category="migration",
            message=f"Manual migration of thread {tid} to Node {target_node} CPU {target_cpu}",
            details={
                "pid": pid,
                "tid": tid,
                "source_node": current_node,
                "target_node": target_node,
                "target_cpu": target_cpu,
                "success": success,
            },
        )
        db.add(log)
        db.commit()

        return event

    def set_affinity(self, pid: int, tid: int, cpu_mask: List[int]) -> bool:
        from app.utils.system_utils import set_cpu_affinity as set_aff

        return set_aff(tid, cpu_mask)
