import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Cpu,
  Activity,
  GitBranch,
  BarChart3,
  Building2,
  ScrollText,
  Settings,
  Boxes,
} from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/topology', icon: Boxes, label: 'NUMA Topology' },
  { to: '/threads', icon: Cpu, label: 'Threads' },
  { to: '/scheduler', icon: GitBranch, label: 'Scheduler' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/architecture', icon: Building2, label: 'Architecture' },
  { to: '/logs', icon: ScrollText, label: 'Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 z-50">
      <div className="h-full glass rounded-none border-l-0 border-y-0 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-numa-500 to-numa-700 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">NUMA Scheduler</h1>
              <p className="text-[10px] text-slate-500 font-mono">v1.0.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <link.icon className="w-4 h-4 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>System Online</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
