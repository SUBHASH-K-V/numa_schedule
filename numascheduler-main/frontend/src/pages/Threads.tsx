import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  ArrowUpDown,
  Filter,
  Cpu,
  Activity,
  RefreshCw,
  Gauge,
} from 'lucide-react'
import { api } from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'
import type { ThreadInfo } from '../types'

export default function Threads() {
  const [threads, setThreads] = useState<ThreadInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<string>('cpu_usage')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterNode, setFilterNode] = useState<number | null>(null)
  const { lastMessage } = useWebSocket()

  const fetchThreads = async () => {
    try {
      const data = await api.threads.list()
      setThreads(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchThreads()
    const interval = setInterval(fetchThreads, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (lastMessage?.threads) {
      setThreads(lastMessage.threads as ThreadInfo[])
    }
  }, [lastMessage])

  const filtered = threads
    .filter((t) => {
      if (search && !t.name?.toLowerCase().includes(search.toLowerCase()) && !String(t.tid).includes(search)) {
        return false
      }
      if (filterNode !== null && t.current_node !== filterNode) return false
      return true
    })
    .sort((a, b) => {
      const aVal = (a as any)[sortField] ?? 0
      const bVal = (b as any)[sortField] ?? 0
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const columns = [
    { key: 'pid', label: 'PID', sortable: true },
    { key: 'tid', label: 'TID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'current_cpu', label: 'CPU', sortable: true },
    { key: 'current_node', label: 'Node', sortable: true },
    { key: 'preferred_node', label: 'Preferred', sortable: true },
    { key: 'cpu_usage', label: 'CPU %', sortable: true },
    { key: 'memory_usage', label: 'Mem (MB)', sortable: true },
    { key: 'remote_access_ratio', label: 'Remote %', sortable: true },
    { key: 'status', label: 'Status', sortable: false },
  ]

  const uniqueNodes = [...new Set(threads.map((t) => t.current_node))].sort()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Thread Monitoring</h1>
          <p className="text-sm text-slate-400 mt-1">{threads.length} threads tracked</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchThreads}
          className="glass px-4 py-2 text-sm text-slate-300 hover:text-white flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </motion.button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by TID or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-numa-500/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {[null, ...uniqueNodes].map((n) => (
            <button
              key={n ?? 'all'}
              onClick={() => setFilterNode(n)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                filterNode === n
                  ? 'bg-numa-500/20 text-numa-300 border border-numa-500/30'
                  : 'glass text-slate-400 hover:text-slate-200'
              }`}
            >
              {n === null ? 'All' : `Node ${n}`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-numa-400 animate-spin" />
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider ${
                        col.sortable ? 'cursor-pointer hover:text-slate-200' : ''
                      }`}
                      onClick={() => col.sortable && toggleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && sortField === col.key && (
                          <ArrowUpDown className={`w-3 h-3 ${sortDir === 'asc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((thread) => (
                  <motion.tr
                    key={`${thread.tid}-${thread.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{thread.pid}</td>
                    <td className="px-4 py-3 font-mono text-xs text-numa-300">{thread.tid}</td>
                    <td className="px-4 py-3 text-slate-300">{thread.name || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">CPU {thread.current_cpu}</td>
                    <td className="px-4 py-3">
                      <span className={`node-chip node-chip-${thread.current_node}`}>
                        Node {thread.current_node}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`node-chip node-chip-${thread.preferred_node}`}>
                        Node {thread.preferred_node}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              thread.cpu_usage > 80 ? 'bg-red-400' : thread.cpu_usage > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(thread.cpu_usage, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-slate-300">{thread.cpu_usage.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{thread.memory_usage?.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs ${thread.remote_access_ratio > 0.3 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {(thread.remote_access_ratio * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`status-dot ${thread.status}`} />
                        <span className="text-xs text-slate-400 capitalize">{thread.status}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No threads found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
