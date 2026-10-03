import { useEffect, useState } from 'react'
import { negocioService, type NegocioPublico } from '@/services/negocioService'
import { MIN_LETRAS_BUSQUEDA_NEGOCIOS, normalizarListaNegocios } from './negociosPublicos'

/** Resultados por "consulta|límite" durante la sesión (el directorio cambia poco). */
const cache = new Map<string, NegocioPublico[]>()
/** Consultas que fallaron: no se reintentan en bucle; vuelven a probar al cambiar el texto. */
const fallidas = new Set<string>()
const ESPERA_MS = 250

/** Clave de caché: minúsculas y sin tildes, como compara el backend. */
export function claveBusquedaNegocios(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Negocios cuyo nombre o slug coincide con `texto` (GET /api/public/negocios?q=). */
export function useBuscarNegocios(texto: string, limite = 4) {
  const clave = claveBusquedaNegocios(texto)
  const activo = clave.length >= MIN_LETRAS_BUSQUEDA_NEGOCIOS
  const llave = `${clave}|${limite}`
  const [, refrescar] = useState(0)

  useEffect(() => {
    if (!activo || cache.has(llave)) return
    fallidas.delete(llave)
    const control = new AbortController()
    // Pequeña espera: escribir rápido no dispara una petición por tecla (GET /api/public/** tiene tope por minuto).
    const espera = setTimeout(() => {
      negocioService.buscar({ q: clave, limite }, control.signal)
        .then(({ data }) => { cache.set(llave, normalizarListaNegocios(data)) })
        .catch(() => { if (!control.signal.aborted) fallidas.add(llave) })
        .finally(() => { if (!control.signal.aborted) refrescar((n) => n + 1) })
    }, ESPERA_MS)
    return () => { clearTimeout(espera); control.abort() }
  }, [llave, clave, activo, limite])

  if (!activo) return { negocios: [] as NegocioPublico[], cargando: false }
  return { negocios: cache.get(llave) ?? [], cargando: !cache.has(llave) && !fallidas.has(llave) }
}

/** Solo para tests. */
export function limpiarCacheNegocios() {
  cache.clear()
  fallidas.clear()
}
