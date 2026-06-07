# NUMA-Aware Thread Migration & Scheduling Framework

A production-quality Linux-based framework that monitors thread execution, NUMA memory locality, CPU affinity, and memory access patterns, then intelligently migrates threads to optimal NUMA nodes to minimize remote memory access and improve performance.

## Architecture

```
┌─────────────────────────────────────────────┐
│            Application Layer                 │
├─────────────────────────────────────────────┤
│            Monitoring Layer                  │
│  /proc, psutil, numastat, CPU affinity       │
├─────────────────────────────────────────────┤
│            Analysis Engine                   │
│  Remote access ratio, preferred node calc    │
├─────────────────────────────────────────────┤
│            Scheduling Engine                 │
│  IF remote > threshold AND load OK → migrate │
├─────────────────────────────────────────────┤
│            Migration Engine                  │
│  sched_setaffinity(), taskset, tracking      │
├─────────────────────────────────────────────┤
│            Linux Scheduler (CFS)             │
├─────────────────────────────────────────────┤
│            NUMA Hardware                     │
└─────────────────────────────────────────────┘
```

## Features

- **NUMA Topology Discovery** - Auto-detect NUMA nodes, CPU cores, memory via `lscpu` and `numactl`
- **Thread Monitoring** - Real-time tracking of CPU usage, memory, affinity, NUMA locality
- **Intelligent Scheduling** - Rule-based migration decisions based on remote access ratios and node loads
- **Migration Engine** - Automatic and manual thread migration with `sched_setaffinity()`
- **Performance Analytics** - Charts, heatmaps, efficiency scores, PDF/CSV export
- **Real-time Updates** - WebSocket streaming of system metrics
- **Modern Dashboard** - Dark mode, glassmorphism UI with React + Tailwind + Framer Motion

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Framer Motion, Recharts, Lucide Icons |
| Backend | Python FastAPI, SQLAlchemy, psutil, WebSockets |
| Database | SQLite |
| Linux APIs | `numactl`, `numastat`, `lscpu`, `/proc`, `taskset`, `sched_setaffinity()` |

## Project Structure

```
numa-scheduler/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app with WebSocket support
│   │   ├── database.py             # SQLite database setup
│   │   ├── models.py               # ORM models (ThreadMetric, Migration, etc.)
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── topology.py         # NUMA topology endpoints
│   │   │   ├── threads.py          # Thread monitoring endpoints
│   │   │   ├── scheduler.py        # Scheduler & migration endpoints
│   │   │   ├── analytics.py        # Analytics & reporting endpoints
│   │   │   ├── logs.py             # Log management endpoints
│   │   │   └── reports.py          # PDF & CSV export endpoints
│   │   ├── services/
│   │   │   ├── topology_service.py # NUMA topology discovery
│   │   │   ├── monitor_service.py  # Thread monitoring engine
│   │   │   ├── scheduler_service.py# Scheduling & migration engine
│   │   │   ├── analytics_service.py# Performance analytics
│   │   │   └── report_service.py   # PDF/CSV report generation
│   │   └── utils/
│   │       └── system_utils.py     # Linux system call wrappers
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── types/index.ts          # TypeScript type definitions
│   │   ├── services/
│   │   │   ├── api.ts              # REST API client
│   │   │   └── websocket.ts        # WebSocket client
│   │   ├── hooks/useWebSocket.ts   # WebSocket React hook
│   │   ├── components/
│   │   │   ├── ui/MetricCard.tsx   # Animated metric card
│   │   │   └── dashboard/Sidebar.tsx # Navigation sidebar
│   │   ├── pages/
│   │   │   ├── Overview.tsx        # System overview dashboard
│   │   │   ├── Topology.tsx        # NUMA topology visualization
│   │   │   ├── Threads.tsx         # Thread monitoring table
│   │   │   ├── Scheduler.tsx       # Migration decision flow
│   │   │   ├── Analytics.tsx       # Charts & performance metrics
│   │   │   ├── Architecture.tsx    # System architecture diagram
│   │   │   ├── Logs.tsx            # Event log viewer
│   │   │   └── Settings.tsx        # Scheduler configuration
│   │   ├── App.tsx                 # Root component with routing
│   │   └── main.tsx                # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Installation

### Prerequisites

- Linux system with NUMA support (verify with `numactl --hardware`)
- Python 3.10+
- Node.js 18+
- `numactl` package (`apt install numactl` on Debian/Ubuntu)

### Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd numa-scheduler

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Start the backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

# In another terminal, install frontend dependencies
cd frontend
npm install

# Start the frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

### Docker Deployment

```bash
docker-compose up --build
```

Access the dashboard at `http://localhost:3000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/overview` | System overview metrics |
| GET | `/api/topology` | NUMA topology |
| POST | `/api/topology/refresh` | Rediscover topology |
| GET | `/api/threads` | Thread metrics list |
| GET | `/api/threads/{tid}` | Single thread detail |
| GET | `/api/scheduler/decisions` | Scheduler decisions |
| GET | `/api/scheduler/migrations` | Migration history |
| POST | `/api/scheduler/evaluate` | Evaluate all threads |
| POST | `/api/scheduler/migrate` | Manual migration |
| POST | `/api/scheduler/affinity` | Set CPU affinity |
| GET | `/api/scheduler/config` | Get scheduler config |
| PUT | `/api/scheduler/config` | Update scheduler config |
| GET | `/api/analytics/report` | Performance report |
| GET | `/api/analytics/cpu-usage` | CPU usage history |
| GET | `/api/analytics/migration-frequency` | Migration frequency |
| GET | `/api/analytics/numa-access` | Local vs remote access |
| GET | `/api/analytics/heatmap` | NUMA load heatmap |
| GET | `/api/analytics/efficiency` | Scheduler efficiency |
| GET | `/api/logs` | System logs |
| DELETE | `/api/logs` | Clear logs |
| GET | `/api/reports/pdf` | Download PDF report |
| GET | `/api/reports/csv/{model}` | Export CSV data |
| WS | `/ws` | WebSocket metrics stream |

## Scheduling Algorithm

```python
IF remote_access_ratio > threshold
   AND destination_node_load < source_node_load
THEN migrate thread to preferred_node
```

The scheduler:
1. Calculates remote access ratio from local/remote memory access counters
2. Determines preferred node based on CPU affinity mask analysis
3. Evaluates source vs destination node load
4. Makes migration decision with confidence scoring
5. Executes migration via `sched_setaffinity()`
6. Enforces cooldown period to prevent thrashing
7. Logs every decision and migration event

## License

MIT
