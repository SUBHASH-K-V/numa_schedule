import json
import asyncio
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.models import ThreadMetric, SystemMetric, MigrationEvent
from app.services.topology_service import TopologyService
from app.services.monitor_service import MonitorService
from app.services.scheduler_service import SchedulerService
from app.routers import topology, threads, scheduler, analytics, logs, reports

topology_service = TopologyService()
monitor_service = MonitorService(topology_service)
scheduler_service = SchedulerService(topology_service)


def get_topology_service() -> TopologyService:
    return topology_service


def get_monitor_service() -> MonitorService:
    return monitor_service


def get_scheduler_service() -> SchedulerService:
    return scheduler_service


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    topology_service.discover()
    monitor_service.start(interval=2.0)

    async def periodic_broadcast():
        while True:
            try:
                await asyncio.sleep(2)
                db = SessionLocal()
                try:
                    threads_data = monitor_service.get_latest_thread_metrics(db)
                    system_data = monitor_service.get_system_metrics(db, limit=1)
                    numa_data = monitor_service.get_numa_metrics(db, limit=10)

                    threads_serialized = []
                    for t in threads_data[:20]:
                        threads_serialized.append(
                            {
                                "pid": t.pid,
                                "tid": t.tid,
                                "name": t.name,
                                "cpu_usage": t.cpu_usage,
                                "memory_usage": t.memory_usage,
                                "current_cpu": t.current_cpu,
                                "current_node": t.current_node,
                                "preferred_node": t.preferred_node,
                                "remote_access_ratio": t.remote_access_ratio,
                                "status": t.status,
                            }
                        )

                    topo = topology_service.get_topology()
                    numa_count = len(topo)
                    if monitor_service.is_simulation_mode() and numa_count <= 1:
                        numa_count = 2

                    system_serialized = []
                    for s in system_data:
                        system_serialized.append(
                            {
                                "total_cpus": s.total_cpus,
                                "cpu_percent": s.cpu_percent,
                                "used_memory": s.used_memory,
                                "total_memory": s.total_memory,
                                "running_threads": s.running_threads,
                                "active_migrations": s.active_migrations,
                                "scheduler_efficiency": s.scheduler_efficiency,
                                "numa_nodes": numa_count,
                            }
                        )

                    numa_serialized = []
                    seen_numa_ids = set()
                    for n in numa_data:
                        if n.node_id not in seen_numa_ids:
                            seen_numa_ids.add(n.node_id)
                            numa_serialized.append(
                                {
                                    "node_id": n.node_id,
                                    "total_memory": n.total_memory,
                                    "free_memory": n.free_memory,
                                    "used_memory": n.used_memory,
                                    "cpu_count": n.cpu_count,
                                    "active_threads": n.active_threads,
                                    "node_load": n.node_load,
                                }
                            )
                    if monitor_service.is_simulation_mode() and len(topology_service.get_topology()) <= 1:
                        if 1 not in seen_numa_ids:
                            numa_serialized.append({
                                "node_id": 1,
                                "total_memory": 8192,
                                "free_memory": 2048,
                                "used_memory": 6144,
                                "cpu_count": 2,
                                "active_threads": 0,
                                "node_load": 35.0,
                            })

                    await manager.broadcast(
                        {
                            "type": "metrics_update",
                            "threads": threads_serialized,
                            "system": system_serialized,
                            "numa_nodes": numa_serialized,
                        }
                    )
                finally:
                    db.close()
            except Exception:
                pass

    task = asyncio.create_task(periodic_broadcast())

    yield

    task.cancel()
    monitor_service.stop()


app = FastAPI(
    title="NUMA-Aware Thread Migration & Scheduling Framework",
    description="A Linux-based framework for monitoring, analyzing, and migrating threads across NUMA nodes",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(topology.router)
app.include_router(threads.router)
app.include_router(scheduler.router)
app.include_router(analytics.router)
app.include_router(logs.router)
app.include_router(reports.router)


@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": "NUMA Scheduler",
        "version": "1.0.0",
        "topology_loaded": len(topology_service.get_topology()) > 0,
    }


@app.get("/api/overview")
async def get_overview():
    db = SessionLocal()
    try:
        topology = topology_service.get_topology()
        system = monitor_service.get_system_metrics(db, limit=1)
        threads = monitor_service.get_latest_thread_metrics(db)
        numa_metrics = monitor_service.get_numa_metrics(db, limit=20)

        numa_node_count = len(topology)
        if monitor_service.is_simulation_mode() and numa_node_count <= 1:
            numa_node_count = 2

        sys_data = system[0] if system else None
        return {
            "total_cpus": topology_service.get_total_cpus(),
            "numa_nodes": numa_node_count,
            "running_threads": len(threads),
            "active_migrations": sys_data.active_migrations if sys_data else 0,
            "cpu_percent": sys_data.cpu_percent if sys_data else 0,
            "used_memory": sys_data.used_memory if sys_data else 0,
            "total_memory": sys_data.total_memory if sys_data else 0,
            "scheduler_efficiency": sys_data.scheduler_efficiency if sys_data else 0,
        }
    finally:
        db.close()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
