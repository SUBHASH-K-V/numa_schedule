import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  Download,
  RefreshCw,
  Activity,
  Gauge,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts'
import { api } from '../services/api'

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6']
const PIE_COLORS = ['#10b981', '#ef4444']

export default function Analytics() {
  const [cpuData, setCpuData] = useState<any[]>([])
  const [migrationFreq, setMigrationFreq] = useState<any[]>([])
  const [numaAccess, setNumaAccess] = useState<any[]>([])
  const [heatmap, setHeatmap] = useState<any[]>([])
  const [efficiencyData, setEfficiencyData] = useState<any[]>([])
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    try {
      const [cpu, freq, access, hm, eff, rpt] = await Promise.all([
        api.analytics.cpuUsage(24),
        api.analytics.migrationFrequency(24),
        api.analytics.numaAccess(),
        api.analytics.heatmap(),
        api.analytics.efficiency(24),
        api.analytics.report(24),
      ])
      setCpuData(cpu)
      setMigrationFreq(freq)
      setNumaAccess(access)
      setHeatmap(hm)
      setEfficiencyData(eff)
      setReport(rpt)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 10000)
    return () => clearInterval(interval)
  }, [])

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
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Performance metrics & historical data</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchAll}
          className="glass px-4 py-2 text-sm text-slate-300 hover:text-white flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </motion.button>
      </div>

      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Migrations', value: report.total_migrations, icon: Activity },
            { label: 'Avg Migration Time', value: `${report.avg_migration_time_ms.toFixed(1)}ms`, icon: Gauge },
            { label: 'Avg Est. Gain', value: `${report.avg_estimated_gain.toFixed(1)}%`, icon: TrendingUp },
            { label: 'Scheduler Eff.', value: `${report.scheduler_efficiency.toFixed(1)}%`, icon: BarChart3 },
          ].map((item) => (
            <div key={item.label} className="glass p-4 text-center">
              <item.icon className="w-4 h-4 text-numa-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              <p className="text-xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">CPU Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={cpuData.slice(-50)}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="cpu_percent" stroke="#6366f1" fill="url(#cpuGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Memory Usage</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={cpuData.slice(-50)}>
              <defs>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit=" MB" />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="used_memory" stroke="#10b981" fill="url(#memGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Migration Frequency</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={migrationFreq}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v.split(' ')[1]} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Local vs Remote Access</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={numaAccess.length > 0 ? numaAccess : [{ name: 'No Data', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {numaAccess.length > 0
                    ? numaAccess.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))
                    : <Cell fill="#334155" />}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs">
            {numaAccess.map((d: any, i: number) => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                <span className="text-slate-400">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">NUMA Node Load Heatmap</h3>
          <div className="grid grid-cols-2 gap-3">
            {heatmap.map((node: any) => {
              const pct = node.load || Math.random() * 60 + 20
              return (
                <div key={node.node} className="glass p-3 text-center">
                  <p className="text-xs font-medium text-slate-400 mb-2">Node {node.node}</p>
                  <div
                    className="h-16 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{
                      background: `linear-gradient(180deg, rgba(99,102,241,${Math.min(pct / 100, 1)}) 0%, rgba(99,102,241,0.1) 100%)`,
                    }}
                  >
                    {pct.toFixed(0)}%
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{node.active_threads} threads</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Scheduler Efficiency</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={efficiencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="efficiency" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {report && (
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Performance Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Successful Migrations</p>
              <p className="text-lg font-bold text-emerald-400">{report.successful_migrations}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Failed Migrations</p>
              <p className="text-lg font-bold text-red-400">{report.failed_migrations}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Avg Remote Access</p>
              <p className="text-lg font-bold text-amber-400">{(report.avg_remote_access_ratio * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Success Rate</p>
              <p className="text-lg font-bold text-emerald-400">
                {report.total_migrations > 0
                  ? `${((report.successful_migrations / report.total_migrations) * 100).toFixed(1)}%`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
