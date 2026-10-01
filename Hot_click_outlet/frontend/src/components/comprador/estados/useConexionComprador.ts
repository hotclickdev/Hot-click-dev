import { useEffect, useState } from 'react'
import { navegadorSinRed } from './conexionHelpers'

/** Estado de conexión del comprador. No toca la cola de sincronización del panel (`useOffline`). */
export function useConexionComprador(): { enLinea: boolean } {
  const [enLinea, setEnLinea] = useState(() => !navegadorSinRed())
  useEffect(() => {
    const alConectar = () => setEnLinea(true)
    const alDesconectar = () => setEnLinea(false)
    globalThis.addEventListener('online', alConectar)
    globalThis.addEventListener('offline', alDesconectar)
    return () => {
      globalThis.removeEventListener('online', alConectar)
      globalThis.removeEventListener('offline', alDesconectar)
    }
  }, [])
  return { enLinea }
}
