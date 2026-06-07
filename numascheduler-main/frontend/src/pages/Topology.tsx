import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Boxes, MemoryStick, Cpu, RefreshCw, Activity } from 'lucide-react'
import { api } from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'
import type { NumaTopology, NumaNode } from '../types'

function NodeCard({ node, index }: { node: NumaNode; index: number }) {
  const memPercent = node.total_memory > 0 ? (node.free_memory / node.total_memory) * 100 : 0
  const colors = ['from-numa-500 to-numa-600', 'from-emerald-500 to-emerald-600', 'from-amber-500 to-amber-600', 'from-rose-500 to-rose-600']

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="glass p-5"
    >
      <div className={`h-1.5 rounded-full bg-gradient-to-r ${colors[index % colors.length]} mb-4`} />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-numa-400" />
          <h3 className="text-lg font-bold text-white">Node {node.node_id}</h3>
        </div>
        <div className="node-chip node-chip-{node.node_id}">
          {node.cpus.length} CPUs
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Memory</span>
            <span>{node.free_memory.toFixed(0)} MB free / {node.total_memory.toFixed(0)} MB</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${100 - memPercent}%` }}
              transition={{ duration: 1, delay: index * 0.15 }}
              className={`h-full rounded-full bg-gradient-to-r ${colors[index % colors.length]}`}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Cpu className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-300 font-mono text-xs">
            {node.cpus.map((c) => `CPU${c}`).join(', ')}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>{node.active_threads} threads</span>
          </div>
          <div className="flex items-center gap-1">
            <MemoryStick className="w-3 h-3" />
            <span>{node.node_load.toFixed(1)}% load</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Topology() {
  const [topology, setTopology] = useState<NumaTopology | null>(null)
  const [loading, setLoading] = useState(true)
  const { lastMessage } = useWebSocket()

  const fetchTopology = async () => {
    try {
      const data = await api.topology.get()
      setTopology(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopology()
  }, [])

  useEffect(() => {
    if (lastMessage?.numa_nodes && topology) {
      setTopology((prev) => {
        if (!prev) return prev
        const updatedNodes = prev.nodes.map((n) => {
          const live = lastMessage.numa_nodes?.find((ln: any) => ln.node_id === n.node_id)
          return live
            ? { ...n, free_memory: live.free_memory, active_threads: live.active_threads, node_load: live.node_load }
            : n
        })
        return { ...prev, nodes: updatedNodes }
      })
    }
  }, [lastMessage])

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
          <h1 className="text-2xl font-bold text-white">NUMA Topology</h1>
          <p className="text-sm text-slate-400 mt-1">
            {topology?.total_cpus ?? 0} CPUs across {topology?.nodes.length ?? 0} NUMA nodes
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchTopology}
          className="glass px-4 py-2 text-sm text-slate-300 hover:text-white flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Rediscover
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topology?.nodes.map((node, i) => (
          <NodeCard key={node.node_id} node={node} index={i} />
        ))}
      </div>

      {topology && (
        <div className="glass p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Topology Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Nodes', value: topology.nodes.length },
              { label: 'Total CPUs', value: topology.total_cpus },
              { label: 'Total Memory', value: `${(topology.total_memory / 1024).toFixed(1)} GB` },
              { label: 'Avg Node Load', value: `${(topology.nodes.reduce((a, n) => a + n.node_load, 0) / topology.nodes.length).toFixed(1)}%` },
            ].map((item) => (
              <div key={item.label} className="glass py-3 px-4 text-center">
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className="text-lg font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
