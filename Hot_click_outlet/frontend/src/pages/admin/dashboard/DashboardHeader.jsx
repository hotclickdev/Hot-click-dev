import { TargetIcon } from './dashboardIcons'

export default function DashboardHeader({ title, welcome, onOpenTour, serverStatus }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-[#e8e8ed]">{title}</h1>
        <p className="text-sm text-[#8e8e9a] mt-1">{welcome}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {serverStatus && (
          <span className="text-xs" style={{ color: serverStatus.up ? '#4ade80' : '#f87171' }}>
            {serverStatus.up ? `API ${serverStatus.ms} ms` : 'API caída'}
          </span>
        )}
      <button type="button"
        onClick={onOpenTour}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80 shrink-0"
        style={{ backgroundColor: 'rgba(23,71,168,0.1)', border: '1px solid rgba(23,71,168,0.25)', color: 'var(--hc-blue-300)' }}
      >
        <TargetIcon /> Ver tutorial
      </button>
      </div>
    </div>
  )
}
