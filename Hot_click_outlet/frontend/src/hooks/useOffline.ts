import { useState, useEffect, useCallback } from 'react'
import { contarPendientes } from '@/db/offlineDb'
import { contarCapturaPendientes } from '@/db/capturaOffline'
import { procesarCola } from '@/services/syncService'
import { procesarColaCaptura } from '@/services/capturaSyncService'

/**
 * Detecta el estado de conexión y gestiona la cola de sincronización.
 *
 * Retorna:
 *   isOnline        — true si hay conexión a internet
 *   pendientes      — items en cola general + captura pendientes
 *   pendientesCaptura — items en cola de captura (PENDIENTE | ERROR, intentos < 5)
 *   syncing         — true mientras se procesa la cola
 *   lastSyncResult  — resultado del último intento { procesados, errores, conflictos }
 *   syncAhora       — función para disparar sync manual
 *   recargarConteo  — refresca el conteo de pendientes sin sincronizar
 */
export function useOffline() {
  const [isOnline, setIsOnline]           = useState(navigator.onLine)
  const [pendientes, setPendientes]             = useState(0)
  const [pendientesCaptura, setPendientesCaptura] = useState(0)
  const [syncing, setSyncing]             = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<{ procesados: number; errores: number; conflictos: number } | null>(null)

  const recargarConteo = useCallback(async () => {
    const [n, nCaptura] = await Promise.all([contarPendientes(), contarCapturaPendientes()])
    setPendientes(n + nCaptura)
    setPendientesCaptura(nCaptura)
  }, [])

  const syncAhora = useCallback(async () => {
    if (syncing || !navigator.onLine) return
    setSyncing(true)
    try {
      const result = await procesarCola()
      await procesarColaCaptura()
      setLastSyncResult(result)
      await recargarConteo()
    } finally {
      setSyncing(false)
    }
  }, [syncing, recargarConteo])

  // Detectar online/offline
  useEffect(() => {
    const onOnline  = () => { setIsOnline(true);  void syncAhora() }
    const onOffline = () => setIsOnline(false)

    globalThis.addEventListener('online',  onOnline)
    globalThis.addEventListener('offline', onOffline)
    return () => {
      globalThis.removeEventListener('online',  onOnline)
      globalThis.removeEventListener('offline', onOffline)
    }
  }, [syncAhora])

  // Cargar conteo al montar y al volver a enfocar la pestaña
  useEffect(() => {
    void recargarConteo()
    const onFocus = () => { void recargarConteo() }
    globalThis.addEventListener('focus', onFocus)
    return () => globalThis.removeEventListener('focus', onFocus)
  }, [recargarConteo])

  // Intentar sync al montar si hay conexión
  useEffect(() => {
    if (navigator.onLine) void syncAhora()
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [])

  return { isOnline, pendientes, pendientesCaptura, syncing, lastSyncResult, syncAhora, recargarConteo }
}
