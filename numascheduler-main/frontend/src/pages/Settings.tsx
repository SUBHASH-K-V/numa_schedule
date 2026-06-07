import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Save,
  RefreshCw,
  ToggleLeft,
  Gauge,
  Clock,
  Bell,
  Download,
  FlaskConical,
} from 'lucide-react'
import { api } from '../services/api'
import type { SchedulerConfig } from '../types'

export default function SettingsPage() {
  const [config, setConfig] = useState<SchedulerConfig>({
    remote_access_threshold: 0.3,
    migration_cooldown_seconds: 30,
    auto_migration_enabled: true,
    log_level: 'INFO',
    monitoring_interval: 2,
    simulation_mode: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.scheduler.getConfig().then((c) => {
      setConfig(c)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.scheduler.updateConfig(config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const downloadPdf = () => {
    window.open(api.reports.pdf, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 text-numa-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Configure scheduler behavior</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="glass px-4 py-2 text-sm text-slate-300 hover:text-white flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {saved ? 'Saved!' : 'Save'}
        </motion.button>
      </div>

      <div className="glass p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="w-4 h-4 text-numa-400" />
            <h3 className="text-sm font-semibold text-white">Scheduler Threshold</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Migrate when remote access ratio exceeds this threshold
          </p>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.remote_access_threshold}
            onChange={(e) => setConfig({ ...config, remote_access_threshold: parseFloat(e.target.value) })}
            className="w-full accent-numa-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0%</span>
            <span className="text-numa-300 font-mono">{(config.remote_access_threshold * 100).toFixed(0)}%</span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-numa-400" />
            <h3 className="text-sm font-semibold text-white">Migration Cooldown (seconds)</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Minimum time between migrations for the same thread
          </p>
          <input
            type="range"
            min="5"
            max="120"
            step="5"
            value={config.migration_cooldown_seconds}
            onChange={(e) => setConfig({ ...config, migration_cooldown_seconds: parseInt(e.target.value) })}
            className="w-full accent-numa-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>5s</span>
            <span className="text-numa-300 font-mono">{config.migration_cooldown_seconds}s</span>
            <span>120s</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <ToggleLeft className="w-4 h-4 text-numa-400" />
            <h3 className="text-sm font-semibold text-white">Auto Migration</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Automatically migrate threads when scheduler decides
          </p>
          <button
            onClick={() => setConfig({ ...config, auto_migration_enabled: !config.auto_migration_enabled })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.auto_migration_enabled ? 'bg-numa-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                config.auto_migration_enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-4 h-4 text-numa-400" />
            <h3 className="text-sm font-semibold text-white">Simulation Mode</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Simulate a second NUMA node so migrations appear even on single-node hardware
          </p>
          <button
            onClick={() => setConfig({ ...config, simulation_mode: !config.simulation_mode })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.simulation_mode ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                config.simulation_mode ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
          {config.simulation_mode && (
            <p className="text-[11px] text-amber-400/70 mt-2">
              Virtual Node 1 active. Threads will be assigned random remote access ratios to trigger simulated migrations.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-numa-400" />
            <h3 className="text-sm font-semibold text-white">Log Level</h3>
          </div>
          <select
            value={config.log_level}
            onChange={(e) => setConfig({ ...config, log_level: e.target.value })}
            className="glass px-3 py-2 text-sm text-slate-200 w-full mt-2 focus:outline-none focus:border-numa-500/40"
          >
            {['DEBUG', 'INFO', 'WARNING', 'ERROR'].map((l) => (
              <option key={l} value={l} className="bg-slate-900">{l}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Download className="w-4 h-4 text-numa-400" />
            <h3 className="text-sm font-semibold text-white">Reports</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">Download system reports</p>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={downloadPdf}
              className="glass px-4 py-2 text-xs text-slate-300 hover:text-white"
            >
              Download PDF Report
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.open(api.reports.csv('migrations'), '_blank')}
              className="glass px-4 py-2 text-xs text-slate-300 hover:text-white"
            >
              Export Migrations CSV
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.open(api.reports.csv('threads'), '_blank')}
              className="glass px-4 py-2 text-xs text-slate-300 hover:text-white"
            >
              Export Threads CSV
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
