import { useCallback, useEffect, useState } from 'react'
import { altaNegocioService } from '@/services/altaNegocioService'
import { leerEstado, mostrarPanelAlta, urlDeRespuesta, type EstadoAlta } from './altaFases'

const REFRESCO_MS = 120_000

/** Estado del alta del negocio del token. Solo se consulta si `activo` (dueño del negocio); un 403 se ignora. */
export function useAltaNegocio(activo: boolean) {
  const [estado, setEstado] = useState<EstadoAlta | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(() => {
    altaNegocioService.estado()
      .then((r) => setEstado(leerEstado(r.data)))
      .catch(() => setEstado(null))
  }, [])

  useEffect(() => {
    if (!activo) return
    cargar()
  }, [activo, cargar])

  const seguir = mostrarPanelAlta(estado)
  useEffect(() => {
    if (!activo || !seguir) return
    const t = window.setInterval(cargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  }, [activo, seguir, cargar])

  const irAOnvo = useCallback(async () => {
    setOcupado(true)
    setError('')
    try {
      const r = await altaNegocioService.enlaceOnvo()
      const url = urlDeRespuesta(r.data)
      if (!url) {
        setError('Por ahora no hay un enlace disponible. Intente de nuevo en unos minutos o escriba a soporte de HotClick.')
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(cargar, 5_000)
    } catch {
      setError('No se pudo abrir ONVO. Intente de nuevo.')
    } finally {
      setOcupado(false)
    }
  }, [cargar])

  return { estado, ocupado, error, irAOnvo }
}
