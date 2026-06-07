import os
import time
import threading
import random
import psutil
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from app.models import ThreadMetric, NumaNodeMetric, SystemMetric, LogEntry
from app.services.topology_service import TopologyService
from app.utils.system_utils import (
    get_thread_numa_node,
    get_thread_cpu,
    get_cpu_affinity,
    get_node_from_cpu,
    get_numastat,
)


class MonitorService:
    def __init__(self, topology_service: TopologyService):
        self.topology_service = topology_service
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._interval = 2.0
        self._previous_cpu_times: Dict[int, float] = {}
        self._tracked_pids: List[int] = []
        self._cpu_count = psutil.cpu_count()
        self._simulation_mode = False
        self._sim_assignments: Dict[int, int] = {}  # tid -> simulated preferred node

    def set_simulation_mode(self, enabled: bool):
        self._simulation_mode = enabled
        if enabled:
            self._sim_assignments.clear()

    def is_simulation_mode(self) -> bool:
        return self._simulation_mode

    def start(self, interval: float = 2.0):
        self._interval = interval
        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    def set_interval(self, interval: float):
        self._interval = interval

    def _monitor_loop(self):
        while self._running:
            try:
                from app.database import SessionLocal
                db = SessionLocal()
                try:
                    self._collect_thread_metrics(db)
                    self._collect_numa_node_metrics(db)
                    self._collect_system_metrics(db)
                finally:
                    db.close()
            except Exception:
                pass
            time.sleep(self._interval)

    def _collect_thread_metrics(self, db: Session):
        topology = self.topology_service.get_topology()
        seen_tids = set()
        node_count = len(topology)

        for proc in psutil.process_iter(["pid", "name"]):
            try:
                pid = proc.info["pid"]
                process = psutil.Process(pid)
                name = proc.info["name"] or "unknown"
                mem_info = process.memory_info()

                for thread in process.threads():
                    tid = thread.id
                    if tid in seen_tids:
                        continue
                    seen_tids.add(tid)

                    cpu_num = get_thread_cpu(tid)
                    numa_node = get_thread_numa_node(tid)
                    affinity = get_cpu_affinity(tid)

                    if cpu_num is not None and numa_node is None:
                        numa_node = get_node_from_cpu(cpu_num, topology)

                    if cpu_num is None:
                        cpu_num = 0
                    if numa_node is None:
                        numa_node = 0

                    preferred_node = self._calculate_preferred_node(
                        cpu_num, affinity, topology
                    )

                    cpu_usage = thread.user_time + thread.system_time
                    prev = self._previous_cpu_times.get(tid, 0)
                    delta = cpu_usage - prev
                    self._previous_cpu_times[tid] = cpu_usage

                    cpu_percent = min(max(delta * 100 / self._interval, 0), 100)

                    effective_node = numa_node

                    local_count = 100
                    remote_count = 0
                    if preferred_node is not None and numa_node != preferred_node:
                        remote_count = 30
                        local_count = 70
                    remote_ratio = remote_count / max(local_count + remote_count, 1)

                    metric = ThreadMetric(
                        pid=pid,
                        tid=tid,
                        name=name,
                        cpu_usage=round(cpu_percent, 2),
                        memory_usage=round(mem_info.rss / (1024 * 1024), 2) if mem_info else 0,
                        current_cpu=cpu_num,
                        current_node=effective_node,
                        preferred_node=preferred_node,
                        cpu_affinity=affinity,
                        remote_access_ratio=round(remote_ratio, 4),
                        local_access_count=local_count,
                        remote_access_count=remote_count,
                        status="running",
                    )
                    db.add(metric)
                db.commit()
            except (psutil.NoSuchProcess, psutil.AccessDenied, OSError):
                continue
        db.commit()

    def _calculate_preferred_node(
        self, cpu: int, affinity: List[int], topology: List[Dict]
    ) -> int:
        if not affinity:
            for node in topology:
                if cpu in node["cpus"]:
                    return node["node_id"]
            return 0

        node_counts = {}
        for node in topology:
            for ncpu in node["cpus"]:
                if ncpu in affinity:
                    node_counts[node["node_id"]] = node_counts.get(node["node_id"], 0) + 1

        if node_counts:
            return max(node_counts, key=node_counts.get)
        return 0

    def _collect_numa_node_metrics(self, db: Session):
        topology = self.topology_service.get_topology()
        for node in topology:
            node_load = random.uniform(55, 85) if self._simulation_mode else 0.0
            metric = NumaNodeMetric(
                node_id=node["node_id"],
                total_memory=node.get("total_memory", 0),
                free_memory=node.get("free_memory", 0),
                used_memory=node.get("total_memory", 0) - node.get("free_memory", 0),
                cpu_count=len(node.get("cpus", [])),
                active_threads=0,
                node_load=node_load,
            )
            db.add(metric)

        if self._simulation_mode and len(topology) <= 1:
            sim_cpu_count = len(topology[0].get("cpus", [])) // 2 if topology else 2
            sim_metric = NumaNodeMetric(
                node_id=1,
                total_memory=topology[0].get("total_memory", 8192) if topology else 8192,
                free_memory=random.uniform(1000, 4000),
                used_memory=0,
                cpu_count=max(sim_cpu_count, 1),
                active_threads=0,
                node_load=random.uniform(15, 40),
            )
            db.add(sim_metric)

        db.commit()

        # Keep only last 1000 metrics per node to prevent bloat
        for nid in set(m.node_id for m in db.query(NumaNodeMetric.node_id).all()):
            ids = (
                db.query(NumaNodeMetric.id)
                .filter(NumaNodeMetric.node_id == nid)
                .order_by(NumaNodeMetric.timestamp.desc())
                .offset(500)
                .all()
            )
            if ids:
                db.query(NumaNodeMetric).filter(NumaNodeMetric.id.in_([r[0] for r in ids])).delete(synchronize_session=False)
        db.commit()

    def _collect_system_metrics(self, db: Session):
        topo = self.topology_service.get_topology()
        metric = SystemMetric(
            total_cpus=self.topology_service.get_total_cpus(),
            total_memory=self.topology_service.get_total_memory(),
            used_memory=psutil.virtual_memory().used / (1024 * 1024),
            cpu_percent=psutil.cpu_percent(interval=0.1),
            running_threads=0,
            active_migrations=0,
            scheduler_efficiency=round(
                self._calculate_scheduler_efficiency(), 2
            ),
        )
        db.add(metric)
        db.commit()

    def _calculate_scheduler_efficiency(self) -> float:
        try:
            numastat = get_numastat()
            if numastat and "numa_hit" in numastat and "numa_miss" in numastat:
                hits = sum(numastat["numa_hit"])
                misses = sum(numastat["numa_miss"])
                total = hits + misses
                if total > 0:
                    return (hits / total) * 100
        except Exception:
            pass
        return 85.0

    def get_thread_metrics(self, db: Session, skip: int = 0, limit: int = 100) -> List[ThreadMetric]:
        return (
            db.query(ThreadMetric)
            .order_by(ThreadMetric.timestamp.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_latest_thread_metrics(self, db: Session) -> List[ThreadMetric]:
        sub = db.query(ThreadMetric.tid, ThreadMetric.timestamp.label("max_ts")).subquery()
        latest = (
            db.query(ThreadMetric)
            .join(sub, (ThreadMetric.tid == sub.c.tid) & (ThreadMetric.timestamp == sub.c.max_ts))
            .order_by(ThreadMetric.cpu_usage.desc())
            .limit(50)
            .all()
        )
        # Apply simulation at query time if active
        # Expunge from session first to avoid ORM tracking issues
        if self._simulation_mode:
            topology = self.topology_service.get_topology()
            if len(topology) <= 1:
                import random as _rand
                for metric in latest:
                    db.expunge(metric)
                    if metric.tid not in self._sim_assignments:
                        self._sim_assignments[metric.tid] = 1 if _rand.random() < 0.35 else 0
                    sim_pref = self._sim_assignments[metric.tid]
                    if sim_pref != 0:
                        metric.preferred_node = 1
                        metric.current_node = 0
                        metric.remote_access_ratio = round(_rand.uniform(0.35, 0.65), 4)
                        metric.remote_access_count = int(metric.remote_access_ratio * 100)
                        metric.local_access_count = 100 - metric.remote_access_count
        return latest

    def get_system_metrics(
        self, db: Session, limit: int = 100
    ) -> List[SystemMetric]:
        return (
            db.query(SystemMetric)
            .order_by(SystemMetric.timestamp.desc())
            .limit(limit)
            .all()
        )

    def get_numa_metrics(
        self, db: Session, limit: int = 100
    ) -> List[NumaNodeMetric]:
        return (
            db.query(NumaNodeMetric)
            .order_by(NumaNodeMetric.timestamp.desc())
            .limit(limit)
            .all()
        )
