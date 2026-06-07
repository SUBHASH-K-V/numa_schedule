import { motion } from 'framer-motion'
import {
  Monitor,
  Activity,
  Brain,
  GitBranch,
  ArrowRightFromLine,
  Cpu,
  Boxes,
} from 'lucide-react'

const layers = [
  {
    label: 'Application Layer',
    icon: Monitor,
    desc: 'User-space applications & threads',
    color: 'from-numa-500 to-numa-600',
  },
  {
    label: 'Monitoring Layer',
    icon: Activity,
    desc: '/proc filesystem, psutil, numastat, CPU affinity tracking',
    color: 'from-blue-500 to-blue-600',
  },
  {
    label: 'Analysis Engine',
    icon: Brain,
    desc: 'Remote access ratio, preferred node calculation, threshold evaluation',
    color: 'from-purple-500 to-purple-600',
  },
  {
    label: 'Scheduling Engine',
    icon: GitBranch,
    desc: 'Decision logic: IF remote > threshold AND dest_load < source_load THEN migrate',
    color: 'from-amber-500 to-amber-600',
  },
  {
    label: 'Migration Engine',
    icon: ArrowRightFromLine,
    desc: 'sched_setaffinity(), taskset, migration execution & tracking',
    color: 'from-rose-500 to-rose-600',
  },
  {
    label: 'Linux Scheduler',
    icon: Cpu,
    desc: 'CFS scheduler, CPU affinity, load balancing',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    label: 'NUMA Hardware',
    icon: Boxes,
    desc: 'Physical NUMA nodes, memory controllers, QPI/UPI links',
    color: 'from-emerald-500 to-emerald-600',
  },
]

export default function Architecture() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Architecture</h1>
        <p className="text-sm text-slate-400 mt-1">System architecture & data flow</p>
      </div>

      <div className="glass p-8">
        <div className="flex flex-col items-center gap-0">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.label}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className="flex flex-col items-center"
            >
              <div
                className={`bg-gradient-to-r ${layer.color} p-4 rounded-2xl w-72 text-center relative`}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <layer.icon className="w-4 h-4 text-white/80" />
                  <span className="text-sm font-bold text-white">{layer.label}</span>
                </div>
                <p className="text-[10px] text-white/60">{layer.desc}</p>
              </div>
              {i < layers.length - 1 && (
                <div className="flex flex-col items-center py-1">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="text-numa-400">
                    <motion.path
                      d="M12 5v14M8 15l4 4 4-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      animate={{ y: [0, 3, 0] }}
                      transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                    />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Data Flow</h3>
          <div className="space-y-2 text-xs text-slate-400">
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-numa-500" />
              Thread metrics collected every 2s
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              NUMA topology discovered via numactl/lscpu
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Remote access ratio calculated
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Migration decision evaluated
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Thread migrated via sched_setaffinity
            </p>
          </div>
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Linux APIs Used</h3>
          <div className="space-y-2 text-xs text-slate-400">
            <p className="font-mono text-numa-300">/proc/[tid]/stat</p>
            <p className="font-mono text-numa-300">/proc/[tid]/status</p>
            <p className="font-mono text-numa-300">os.sched_setaffinity()</p>
            <p className="font-mono text-numa-300">os.sched_getaffinity()</p>
            <p className="font-mono text-numa-300">numactl --hardware</p>
            <p className="font-mono text-numa-300">numastat</p>
            <p className="font-mono text-numa-300">lscpu</p>
          </div>
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Tech Stack</h3>
          <div className="space-y-2 text-xs text-slate-400">
            <p><span className="text-numa-300 font-medium">Backend:</span> Python FastAPI</p>
            <p><span className="text-numa-300 font-medium">Frontend:</span> React + TypeScript</p>
            <p><span className="text-numa-300 font-medium">Database:</span> SQLite</p>
            <p><span className="text-numa-300 font-medium">Styling:</span> Tailwind CSS</p>
            <p><span className="text-numa-300 font-medium">Charts:</span> Recharts</p>
            <p><span className="text-numa-300 font-medium">Animations:</span> Framer Motion</p>
            <p><span className="text-numa-300 font-medium">Realtime:</span> WebSocket</p>
          </div>
        </div>
      </div>
    </div>
  )
}
