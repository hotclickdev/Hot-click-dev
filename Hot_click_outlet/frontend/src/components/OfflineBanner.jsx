import { useOffline } from '@/hooks/useOffline'

function plural(n, suffix = 'es') {
  return n === 1 ? '' : suffix
}

function PendingBanner({ pendientes, lastSyncResult, syncAhora }) {
  const conflictos = lastSyncResult?.conflictos ?? 0
  const tieneConflictos = conflictos > 0

  const bgColor    = tieneConflictos ? '#2d1a00' : '#1a2d00'
  const borderColor = tieneConflictos ? '#78350f' : '#365314'
  const dotClass   = tieneConflictos ? 'bg-amber-400' : 'bg-yellow-400'
  const textColor  = tieneConflictos ? '#fb923c' : '#a3e635'
  const btnBg      = tieneConflictos ? 'rgba(251,146,60,0.2)' : 'rgba(163,230,53,0.15)'
  const btnLabel   = tieneConflictos ? 'Ver conflictos' : 'Sincronizar ahora'
  const label      = tieneConflictos
    ? `${conflictos} conflicto${plural(conflictos, 's')} — revisión requerida`
    : `${pendientes} operación${plural(pendientes)} pendiente${plural(pendientes, 's')}`

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
      style={{ backgroundColor: bgColor, borderBottom: `1px solid ${borderColor}` }}
    >
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
        <span style={{ color: textColor }}>{label}</span>
      </div>
      <button type="button"
        onClick={syncAhora}
        className="text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
        style={{ backgroundColor: btnBg, color: textColor }}
      >
        {btnLabel}
      </button>
    </div>
  )
}

export default function OfflineBanner() {
  const { isOnline, pendientes, syncing, lastSyncResult, syncAhora } = useOffline()

  if (isOnline && !syncing && pendientes <= 0) return null

  if (!isOnline) {
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
        style={{ backgroundColor: '#1c1c30', borderBottom: '1px solid #374151', color: '#e5e7eb' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
          <span className="text-red-300 font-medium">Sin conexión</span>
          {pendientes > 0 && (
            <span className="text-xs text-gray-400">
              — {pendientes} operación{plural(pendientes)} en cola
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">Se sincronizará al reconectar</span>
      </div>
    )
  }

  if (syncing) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2 text-sm"
        style={{ backgroundColor: '#0c1a2e', borderBottom: '1px solid #1e3a5f', color: '#93c5fd' }}
      >
        <div
          className="w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0"
          style={{ borderColor: '#1e3a5f', borderTopColor: '#6490EA' }}
        />
        <span>Sincronizando {pendientes} operación{plural(pendientes)}…</span>
      </div>
    )
  }

  return (
    <PendingBanner
      pendientes={pendientes}
      lastSyncResult={lastSyncResult}
      syncAhora={syncAhora}
    />
  )
}
