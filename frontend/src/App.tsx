import { useEffect, useState } from 'react'

interface HealthResponse {
  status: string;
  app: string;
  environment: string;
}

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    fetch(`${apiBase}/health`)
      .then((res) => res.json())
      .then((data) => {
        setHealth(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-xl text-center">
        <h1 className="text-3xl font-bold text-indigo-400 mb-2">StudyVault AI</h1>
        <p className="text-slate-400 text-sm mb-6">MVP Foundation Layer</p>
        
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-left text-xs font-mono">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500">System Health:</span>
            {loading ? (
              <span className="text-amber-400">Checking...</span>
            ) : health ? (
              <span className="text-emerald-400 font-bold">ONLINE ({health.status})</span>
            ) : (
              <span className="text-rose-400 font-bold">OFFLINE</span>
            )}
          </div>
          {health && (
            <div className="pt-2 border-t border-slate-800 text-slate-400">
              <p>App: {health.app}</p>
              <p>Env: {health.environment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}