import { useOffline } from '@/hooks/useOffline'

/**
 * Banner que aparece en la parte superior del panel cuando:
 * - El dispositivo está sin conexión
 * - Hay items pendientes de sincronizar
 * - Se está sincronizando
 */
export default function OfflineBanner() {
  const { isOnline, pendientes, syncing, lastSyncResult, syncAhora } = useOffline()

  // Sin conexión
  if (!isOnline) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
        style={{ backgroundColor: '#1c1c30', borderBottom: '1px solid #374151', color: '#e5e7eb' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
          <span className="text-red-300 font-medium">Sin conexión</span>
          {pendientes > 0 && (
            <span className="text-xs text-gray-400">
              — {pendientes} operación{pendientes > 1 ? 'es' : ''} en cola
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">Se sincronizará al reconectar</span>
      </div>
    )
  }

  // Sincronizando
  if (syncing) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 text-sm"
        style={{ backgroundColor: '#0c1a2e', borderBottom: '1px solid #1e3a5f', color: '#93c5fd' }}>
        <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0"
          style={{ borderColor: '#1e3a5f', borderTopColor: '#6490EA' }} />
        <span>Sincronizando {pendientes} operación{pendientes !== 1 ? 'es' : ''}…</span>
      </div>
    )
  }

  // Items pendientes (con conexión pero sin sincronizar aún)
  if (pendientes > 0) {
    const tieneConflictos = lastSyncResult?.conflictos > 0
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
        style={{
          backgroundColor: tieneConflictos ? '#2d1a00' : '#1a2d00',
          borderBottom: `1px solid ${tieneConflictos ? '#78350f' : '#365314'}`,
        }}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${tieneConflictos ? 'bg-amber-400' : 'bg-yellow-400'}`} />
          <span style={{ color: tieneConflictos ? '#fb923c' : '#a3e635' }}>
            {tieneConflictos
              ? `${lastSyncResult.conflictos} conflicto${lastSyncResult.conflictos > 1 ? 's' : ''} — revisión requerida`
              : `${pendientes} operación${pendientes > 1 ? 'es' : ''} pendiente${pendientes > 1 ? 's' : ''}`
            }
          </span>
        </div>
        <button
          onClick={syncAhora}
          className="text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
          style={{
            backgroundColor: tieneConflictos ? 'rgba(251,146,60,0.2)' : 'rgba(163,230,53,0.15)',
            color: tieneConflictos ? '#fb923c' : '#a3e635',
          }}
        >
          {tieneConflictos ? 'Ver conflictos' : 'Sincronizar ahora'}
        </button>
      </div>
    )
  }

  return null
}
