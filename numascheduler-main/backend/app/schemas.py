from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ThreadMetricResponse(BaseModel):
    id: int
    pid: int
    tid: int
    name: Optional[str]
    cpu_usage: float
    memory_usage: float
    current_cpu: int
    current_node: int
    preferred_node: int
    cpu_affinity: Optional[list]
    remote_access_ratio: float
    local_access_count: int
    remote_access_count: int
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True


class MigrationEventResponse(BaseModel):
    id: int
    pid: int
    tid: int
    source_node: int
    destination_node: int
    source_cpu: int
    destination_cpu: int
    reason: str
    migration_time_ms: float
    estimated_gain: float
    success: bool
    triggered_by: str
    timestamp: datetime

    class Config:
        from_attributes = True


class SchedulerDecisionResponse(BaseModel):
    id: int
    pid: int
    tid: int
    current_node: int
    preferred_node: int
    remote_access_ratio: float
    source_node_load: float
    destination_node_load: float
    threshold_breached: bool
    decision: str
    reason: str
    confidence_score: float
    timestamp: datetime

    class Config:
        from_attributes = True


class NumaNodeMetricResponse(BaseModel):
    id: int
    node_id: int
    total_memory: float
    free_memory: float
    used_memory: float
    cpu_count: int
    active_threads: int
    node_load: float
    timestamp: datetime

    class Config:
        from_attributes = True


class SystemMetricResponse(BaseModel):
    id: int
    total_cpus: int
    total_memory: float
    used_memory: float
    cpu_percent: float
    running_threads: int
    active_migrations: int
    scheduler_efficiency: float
    timestamp: datetime

    class Config:
        from_attributes = True


class LogEntryResponse(BaseModel):
    id: int
    level: str
    category: str
    message: str
    details: Optional[dict]
    timestamp: datetime

    class Config:
        from_attributes = True


class NumaTopologyNode(BaseModel):
    node_id: int
    cpus: List[int]
    total_memory: float
    free_memory: float
    active_threads: int
    node_load: float


class NumaTopologyResponse(BaseModel):
    nodes: List[NumaTopologyNode]
    total_cpus: int
    total_memory: float


class MigrateRequest(BaseModel):
    pid: int
    tid: int
    target_node: int
    target_cpu: Optional[int] = None


class SetAffinityRequest(BaseModel):
    pid: int
    tid: int
    cpu_mask: List[int]


class SchedulerConfig(BaseModel):
    remote_access_threshold: float = 0.3
    migration_cooldown_seconds: int = 30
    auto_migration_enabled: bool = True
    log_level: str = "INFO"
    monitoring_interval: int = 2
    simulation_mode: bool = False


class PerformanceReport(BaseModel):
    total_migrations: int
    successful_migrations: int
    failed_migrations: int
    avg_migration_time_ms: float
    avg_estimated_gain: float
    total_local_accesses: int
    total_remote_accesses: int
    avg_remote_access_ratio: float
    scheduler_efficiency: float
    period_start: datetime
    period_end: datetime
