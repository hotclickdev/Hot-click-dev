import { useState, useEffect, useCallback } from 'react'
import { contarPendientes } from '@/db/offlineDb'
import { procesarCola } from '@/services/syncService'

/**
 * Detecta el estado de conexión y gestiona la cola de sincronización.
 *
 * Retorna:
 *   isOnline        — true si hay conexión a internet
 *   pendientes      — número de items en cola (PENDIENTE | ERROR | CONFLICTO)
 *   syncing         — true mientras se procesa la cola
 *   lastSyncResult  — resultado del último intento { procesados, errores, conflictos }
 *   syncAhora       — función para disparar sync manual
 *   recargarConteo  — refresca el conteo de pendientes sin sincronizar
 */
export function useOffline() {
  const [isOnline, setIsOnline]           = useState(navigator.onLine)
  const [pendientes, setPendientes]       = useState(0)
  const [syncing, setSyncing]             = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState(null)

  const recargarConteo = useCallback(async () => {
    const n = await contarPendientes()
    setPendientes(n)
  }, [])

  const syncAhora = useCallback(async () => {
    if (syncing || !navigator.onLine) return
    setSyncing(true)
    try {
      const result = await procesarCola()
      setLastSyncResult(result)
      await recargarConteo()
    } finally {
      setSyncing(false)
    }
  }, [syncing, recargarConteo])

  // Detectar online/offline
  useEffect(() => {
    const onOnline  = () => { setIsOnline(true);  syncAhora() }
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [syncAhora])

  // Cargar conteo al montar y al volver a enfocar la pestaña
  useEffect(() => {
    recargarConteo()
    const onFocus = () => recargarConteo()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [recargarConteo])

  // Intentar sync al montar si hay conexión
  useEffect(() => {
    if (navigator.onLine) syncAhora()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { isOnline, pendientes, syncing, lastSyncResult, syncAhora, recargarConteo }
}
