from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text, Boolean
from sqlalchemy.sql import func
from app.database import Base


class ThreadMetric(Base):
    __tablename__ = "thread_metrics"

    id = Column(Integer, primary_key=True, index=True)
    pid = Column(Integer)
    tid = Column(Integer)
    name = Column(String(256))
    cpu_usage = Column(Float)
    memory_usage = Column(Float)
    current_cpu = Column(Integer)
    current_node = Column(Integer)
    preferred_node = Column(Integer)
    cpu_affinity = Column(JSON)
    remote_access_ratio = Column(Float)
    local_access_count = Column(Integer, default=0)
    remote_access_count = Column(Integer, default=0)
    status = Column(String(32), default="running")
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class MigrationEvent(Base):
    __tablename__ = "migration_events"

    id = Column(Integer, primary_key=True, index=True)
    pid = Column(Integer)
    tid = Column(Integer)
    source_node = Column(Integer)
    destination_node = Column(Integer)
    source_cpu = Column(Integer)
    destination_cpu = Column(Integer)
    reason = Column(Text)
    migration_time_ms = Column(Float)
    estimated_gain = Column(Float)
    success = Column(Boolean, default=True)
    triggered_by = Column(String(32), default="auto")
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class SchedulerDecision(Base):
    __tablename__ = "scheduler_decisions"

    id = Column(Integer, primary_key=True, index=True)
    pid = Column(Integer)
    tid = Column(Integer)
    current_node = Column(Integer)
    preferred_node = Column(Integer)
    remote_access_ratio = Column(Float)
    source_node_load = Column(Float)
    destination_node_load = Column(Float)
    threshold_breached = Column(Boolean)
    decision = Column(String(64))
    reason = Column(Text)
    confidence_score = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class NumaNodeMetric(Base):
    __tablename__ = "numa_node_metrics"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer)
    total_memory = Column(Float)
    free_memory = Column(Float)
    used_memory = Column(Float)
    cpu_count = Column(Integer)
    active_threads = Column(Integer)
    node_load = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class SystemMetric(Base):
    __tablename__ = "system_metrics"

    id = Column(Integer, primary_key=True, index=True)
    total_cpus = Column(Integer)
    total_memory = Column(Float)
    used_memory = Column(Float)
    cpu_percent = Column(Float)
    running_threads = Column(Integer)
    active_migrations = Column(Integer)
    scheduler_efficiency = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(Integer, primary_key=True, index=True)
    level = Column(String(16))
    category = Column(String(32))
    message = Column(Text)
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
