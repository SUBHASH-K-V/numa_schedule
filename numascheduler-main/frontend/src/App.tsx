import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/dashboard/Sidebar'
import Overview from './pages/Overview'
import Topology from './pages/Topology'
import Threads from './pages/Threads'
import Scheduler from './pages/Scheduler'
import Analytics from './pages/Analytics'
import Architecture from './pages/Architecture'
import Logs from './pages/Logs'
import Settings from './pages/Settings'

export default function App() {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 ml-64">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/topology" element={<Topology />} />
            <Route path="/threads" element={<Threads />} />
            <Route path="/scheduler" element={<Scheduler />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  )
}
