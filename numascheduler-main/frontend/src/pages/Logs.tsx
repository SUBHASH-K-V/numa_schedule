import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ScrollText,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Info,
  AlertCircle,
  XCircle,
  FileText,
} from 'lucide-react'
import { api } from '../services/api'
import type { LogEntry } from '../types'

const levelConfig: Record<string, { icon: any; color: string }> = {
  INFO: { icon: Info, color: 'text-blue-400' },
  WARNING: { icon: AlertTriangle, color: 'text-amber-400' },
  ERROR: { icon: XCircle, color: 'text-red-400' },
  DEBUG: { icon: AlertCircle, color: 'text-slate-400' },
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')

  const fetchLogs = async () => {
    try {
      const data = await api.logs.list({
        level: levelFilter || undefined,
        category: categoryFilter || undefined,
        limit: 200,
      })
      setLogs(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [levelFilter, categoryFilter])

  const handleClear = async () => {
    await api.logs.clear()
    setLogs([])
  }

  const handleExport = async () => {
    const csvUrl = api.reports.csv('migrations')
    window.open(csvUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Logs</h1>
          <p className="text-sm text-slate-400 mt-1">System events and migration history</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="glass px-3 py-2 text-xs text-slate-300 hover:text-white flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Export
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClear}
            className="glass px-3 py-2 text-xs text-red-300 hover:text-red-200 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </motion.button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        {['', 'INFO', 'WARNING', 'ERROR'].map((level) => (
          <button
            key={level || 'all'}
            onClick={() => setLevelFilter(level)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
              levelFilter === level
                ? 'bg-numa-500/20 text-numa-300 border border-numa-500/30'
                : 'glass text-slate-400 hover:text-slate-200'
            }`}
          >
            {level || 'All'}
          </button>
        ))}
        <div className="w-px h-5 bg-white/10 mx-1" />
        {['', 'migration', 'scheduler', 'system'].map((cat) => (
          <button
            key={cat || 'all'}
            onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
              categoryFilter === cat
                ? 'bg-numa-500/20 text-numa-300 border border-numa-500/30'
                : 'glass text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-numa-400 animate-spin" />
        </div>
      ) : (
        <div className="glass divide-y divide-white/5 max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No logs found</p>
            </div>
          ) : (
            logs.map((log) => {
              const cfg = levelConfig[log.level] || levelConfig.INFO
              const Icon = cfg.icon
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-0.5 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{log.level}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 uppercase">
                          {log.category}
                        </span>
                        <span className="text-[10px] text-slate-600 ml-auto font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{log.message}</p>
                      {log.details && (
                        <pre className="mt-1 text-[10px] text-slate-600 font-mono overflow-x-auto">
                          {JSON.stringify(log.details, null, 1)}
                        </pre>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
