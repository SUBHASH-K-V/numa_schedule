import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  GitBranch,
  ArrowRight,
  Brain,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Activity,
} from 'lucide-react'
import { api } from '../services/api'
import type { SchedulerDecision, MigrationEvent } from '../types'

function DecisionFlow({ decision }: { decision: SchedulerDecision }) {
  const steps = [
    { label: 'Thread', value: `TID ${decision.tid}`, icon: Activity, color: 'text-numa-400' },
    { label: 'Analysis', value: `${(decision.remote_access_ratio * 100).toFixed(1)}% remote`, icon: Brain, color: 'text-blue-400' },
    { label: 'Decision', value: decision.decision.toUpperCase(), icon: GitBranch, color: decision.decision === 'migrate' ? 'text-amber-400' : 'text-slate-400' },
    { label: 'Target', value: `Node ${decision.preferred_node}`, icon: Target, color: 'text-emerald-400' },
    {
      label: 'Confidence',
      value: `${(decision.confidence_score * 100).toFixed(0)}%`,
      icon: CheckCircle2,
      color: decision.confidence_score > 0.7 ? 'text-emerald-400' : 'text-amber-400',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-4"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <step.icon className={`w-4 h-4 ${step.color}`} />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{step.label}</p>
              <p className={`text-[11px] font-semibold ${step.color}`}>{step.value}</p>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-slate-600 mx-1" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-white/5">
        <p className="text-xs text-slate-400">{decision.reason}</p>
      </div>
    </motion.div>
  )
}

export default function Scheduler() {
  const [decisions, setDecisions] = useState<SchedulerDecision[]>([])
  const [migrations, setMigrations] = useState<MigrationEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)

  const fetchData = async () => {
    try {
      const [dec, mig] = await Promise.all([
        api.scheduler.decisions(20),
        api.scheduler.migrations(20),
      ])
      setDecisions(dec)
      setMigrations(mig)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleEvaluate = async () => {
    setEvaluating(true)
    try {
      await api.scheduler.evaluate()
      await fetchData()
    } catch {
      // silent
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Scheduler</h1>
          <p className="text-sm text-slate-400 mt-1">NUMA-aware migration decisions</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleEvaluate}
          disabled={evaluating}
          className="glass px-4 py-2 text-sm text-slate-300 hover:text-white flex items-center gap-2"
        >
          {evaluating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Brain className="w-3.5 h-3.5" />
          )}
          Evaluate Threads
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-numa-400" />
            Recent Decisions
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-numa-400 animate-spin" />
            </div>
          ) : decisions.length === 0 ? (
            <div className="glass p-8 text-center text-slate-500">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No decisions yet. Click "Evaluate Threads" to start.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {decisions.map((d) => (
                <DecisionFlow key={d.id} decision={d} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Migration History
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-numa-400 animate-spin" />
            </div>
          ) : migrations.length === 0 ? (
            <div className="glass p-8 text-center text-slate-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No migrations recorded yet.</p>
            </div>
          ) : (
            <div className="glass divide-y divide-white/5 max-h-[600px] overflow-y-auto">
              {migrations.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-numa-300">TID {m.tid}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className="node-chip node-chip-{m.destination_node}">
                        Node {m.destination_node}
                      </span>
                    </div>
                    {m.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {m.migration_time_ms.toFixed(1)}ms
                    </span>
                    <span>Node {m.source_node} → Node {m.destination_node}</span>
                    <span className="text-emerald-400">+{m.estimated_gain.toFixed(1)}% estimated</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">{m.reason}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
