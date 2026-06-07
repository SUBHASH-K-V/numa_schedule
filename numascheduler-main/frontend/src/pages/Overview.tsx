import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu,
  Boxes,
  Activity,
  ArrowRightFromLine,
  MemoryStick,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import { api } from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'
import type { OverviewData } from '../types'

export default function Overview() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const { lastMessage } = useWebSocket()

  const fetchData = async () => {
    try {
      const d = await api.overview()
      setData(d)
    } catch {
      // use websocket data if available
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (lastMessage?.system?.[0]) {
      const sys = lastMessage.system[0]
      setData((prev) => ({
        ...prev!,
        cpu_percent: sys.cpu_percent,
        used_memory: sys.used_memory,
        running_threads: sys.running_threads,
        active_migrations: sys.active_migrations,
        scheduler_efficiency: sys.scheduler_efficiency,
        numa_nodes: sys.numa_nodes ?? prev?.numa_nodes ?? 1,
      }))
    }
  }, [lastMessage])

  const healthScore = data?.scheduler_efficiency ?? 85
  const healthStatus = healthScore > 80 ? 'Healthy' : healthScore > 60 ? 'Degraded' : 'Critical'
  const healthColor = healthScore > 80 ? 'text-emerald-400' : healthScore > 60 ? 'text-amber-400' : 'text-red-400'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 text-numa-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-slate-400 mt-1">System-wide NUMA performance monitoring</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchData}
          className="glass px-4 py-2 text-sm text-slate-300 hover:text-white flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total CPUs"
          value={data?.total_cpus ?? 0}
          icon={<Cpu className="w-5 h-5" />}
        />
        <MetricCard
          title="NUMA Nodes"
          value={data?.numa_nodes ?? 0}
          icon={<Boxes className="w-5 h-5" />}
        />
        <MetricCard
          title="Running Threads"
          value={data?.running_threads ?? 0}
          icon={<Activity className="w-5 h-5" />}
        />
        <MetricCard
          title="Active Migrations"
          value={data?.active_migrations ?? 0}
          icon={<ArrowRightFromLine className="w-5 h-5" />}
          subtitle={data && data.active_migrations > 0 ? 'In progress' : 'Idle'}
          trend={data && data.active_migrations > 0 ? 'up' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="CPU Usage"
          value={`${data?.cpu_percent?.toFixed(1) ?? 0}%`}
          icon={<Gauge className="w-5 h-5" />}
          subtitle={data && data.cpu_percent > 80 ? 'High load' : data && data.cpu_percent > 50 ? 'Moderate' : 'Normal'}
          trend={data && data.cpu_percent > 80 ? 'up' : 'neutral'}
          color={data && data.cpu_percent > 80 ? 'text-red-400' : data && data.cpu_percent > 50 ? 'text-amber-400' : 'text-emerald-400'}
        />
        <MetricCard
          title="Memory Usage"
          value={data ? `${(data.used_memory / 1024).toFixed(1)} GB` : '0 GB'}
          subtitle={data ? `of ${(data.total_memory / 1024).toFixed(1)} GB` : ''}
          icon={<MemoryStick className="w-5 h-5" />}
          trend={data && data.used_memory / data.total_memory > 0.8 ? 'up' : 'neutral'}
        />
        <MetricCard
          title="Scheduler Efficiency"
          value={`${healthScore.toFixed(1)}%`}
          icon={<Gauge className="w-5 h-5" />}
          subtitle={healthStatus}
          trend={healthScore > 80 ? 'up' : healthScore > 60 ? 'neutral' : 'down'}
          color={healthColor}
        />
      </div>

      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-white mb-4">System Health</h2>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${healthColor}`}>
            {healthScore > 80 ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
            <span className="font-medium">{healthStatus}</span>
          </div>
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${healthScore}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                healthScore > 80
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : healthScore > 60
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-red-500 to-red-400'
              }`}
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: 'NUMA Affinity', value: 'Enabled' },
            { label: 'Auto Migration', value: 'Active' },
            { label: 'Monitoring', value: 'Real-time' },
            { label: 'WebSocket', value: lastMessage ? 'Connected' : 'Disconnected' },
          ].map((item) => (
            <div key={item.label} className="glass py-3 px-4">
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              <p className="text-sm font-semibold text-slate-200">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
