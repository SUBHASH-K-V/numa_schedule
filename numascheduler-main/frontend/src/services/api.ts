const BASE_URL = '/api'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export const api = {
  overview: () => fetchJSON<any>('/overview'),
  health: () => fetchJSON<any>('/health'),

  topology: {
    get: () => fetchJSON<any>('/topology'),
    refresh: () => fetchJSON<any>('/topology/refresh', { method: 'POST' }),
  },

  threads: {
    list: (params?: { skip?: number; limit?: number; status?: string; node?: number }) => {
      const q = new URLSearchParams()
      if (params?.skip) q.set('skip', String(params.skip))
      if (params?.limit) q.set('limit', String(params.limit))
      if (params?.status) q.set('status', params.status)
      if (params?.node !== undefined) q.set('node', String(params.node))
      return fetchJSON<any[]>(`/threads?${q}`)
    },
    get: (tid: number) => fetchJSON<any>(`/threads/${tid}`),
  },

  scheduler: {
    decisions: (limit = 50) => fetchJSON<any[]>(`/scheduler/decisions?limit=${limit}`),
    migrations: (limit = 50) => fetchJSON<any[]>(`/scheduler/migrations?limit=${limit}`),
    evaluate: () => fetchJSON<any>('/scheduler/evaluate', { method: 'POST' }),
    migrate: (data: { pid: number; tid: number; target_node: number; target_cpu?: number }) =>
      fetchJSON<any>('/scheduler/migrate', { method: 'POST', body: JSON.stringify(data) }),
    setAffinity: (data: { pid: number; tid: number; cpu_mask: number[] }) =>
      fetchJSON<any>('/scheduler/affinity', { method: 'POST', body: JSON.stringify(data) }),
    getConfig: () => fetchJSON<any>('/scheduler/config'),
    updateConfig: (data: any) =>
      fetchJSON<any>('/scheduler/config', { method: 'PUT', body: JSON.stringify(data) }),
  },

  analytics: {
    report: (hours = 24) => fetchJSON<any>(`/analytics/report?hours=${hours}`),
    cpuUsage: (hours = 24) => fetchJSON<any[]>(`/analytics/cpu-usage?hours=${hours}`),
    migrationFrequency: (hours = 24) => fetchJSON<any[]>(`/analytics/migration-frequency?hours=${hours}`),
    numaAccess: () => fetchJSON<any[]>('/analytics/numa-access'),
    heatmap: () => fetchJSON<any[]>('/analytics/heatmap'),
    efficiency: (hours = 24) => fetchJSON<any[]>(`/analytics/efficiency?hours=${hours}`),
  },

  logs: {
    list: (params?: { level?: string; category?: string; limit?: number }) => {
      const q = new URLSearchParams()
      if (params?.level) q.set('level', params.level)
      if (params?.category) q.set('category', params.category)
      if (params?.limit) q.set('limit', String(params.limit))
      return fetchJSON<any[]>(`/logs?${q}`)
    },
    clear: () => fetchJSON<any>('/logs', { method: 'DELETE' }),
  },

  reports: {
    pdf: () => `${BASE_URL}/reports/pdf`,
    csv: (model: string) => `${BASE_URL}/reports/csv/${model}`,
  },
}
