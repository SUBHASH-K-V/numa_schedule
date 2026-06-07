import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  icon: ReactNode
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: string
}

export default function MetricCard({ title, value, icon, subtitle, trend, color }: MetricCardProps) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-slate-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="metric-card"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <p className={`text-2xl font-bold ${color || 'text-white'}`}>
            {value}
          </p>
          {subtitle && (
            <p className={`text-xs font-medium ${trend ? trendColors[trend] : 'text-slate-500'}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-numa-500/10 border border-numa-500/20 flex items-center justify-center text-numa-400">
          {icon}
        </div>
      </div>
    </motion.div>
  )
}
