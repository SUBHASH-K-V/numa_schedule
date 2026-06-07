export interface NumaNode {
  node_id: number
  cpus: number[]
  total_memory: number
  free_memory: number
  active_threads: number
  node_load: number
}

export interface NumaTopology {
  nodes: NumaNode[]
  total_cpus: number
  total_memory: number
}

export interface ThreadInfo {
  id: number
  pid: number
  tid: number
  name: string
  cpu_usage: number
  memory_usage: number
  current_cpu: number
  current_node: number
  preferred_node: number
  cpu_affinity: number[]
  remote_access_ratio: number
  local_access_count: number
  remote_access_count: number
  status: string
  timestamp: string
}

export interface MigrationEvent {
  id: number
  pid: number
  tid: number
  source_node: number
  destination_node: number
  source_cpu: number
  destination_cpu: number
  reason: string
  migration_time_ms: number
  estimated_gain: number
  success: boolean
  triggered_by: string
  timestamp: string
}

export interface SchedulerDecision {
  id: number
  pid: number
  tid: number
  current_node: number
  preferred_node: number
  remote_access_ratio: number
  source_node_load: number
  destination_node_load: number
  threshold_breached: boolean
  decision: string
  reason: string
  confidence_score: number
  timestamp: string
}

export interface SystemMetric {
  total_cpus: number
  total_memory: number
  used_memory: number
  cpu_percent: number
  running_threads: number
  active_migrations: number
  scheduler_efficiency: number
  numa_nodes?: number
}

export interface OverviewData {
  total_cpus: number
  numa_nodes: number
  running_threads: number
  active_migrations: number
  cpu_percent: number
  used_memory: number
  total_memory: number
  scheduler_efficiency: number
}

export interface NumaNodeMetric {
  node_id: number
  total_memory: number
  free_memory: number
  used_memory: number
  cpu_count: number
  active_threads: number
  node_load: number
}

export interface LogEntry {
  id: number
  level: string
  category: string
  message: string
  details: Record<string, unknown> | null
  timestamp: string
}

export interface PerformanceReport {
  total_migrations: number
  successful_migrations: number
  failed_migrations: number
  avg_migration_time_ms: number
  avg_estimated_gain: number
  total_local_accesses: number
  total_remote_accesses: number
  avg_remote_access_ratio: number
  scheduler_efficiency: number
  period_start: string
  period_end: string
}

export interface WebSocketMessage {
  type: string
  threads?: ThreadInfo[]
  system?: SystemMetric[]
  numa_nodes?: NumaNodeMetric[]
}

export interface SchedulerConfig {
  remote_access_threshold: number
  migration_cooldown_seconds: number
  auto_migration_enabled: boolean
  log_level: string
  monitoring_interval: number
  simulation_mode: boolean
}
