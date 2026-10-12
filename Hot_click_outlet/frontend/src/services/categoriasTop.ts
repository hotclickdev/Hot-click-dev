import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from './api'
import { hayConsentimientoAnalitica } from '@/utils/rastreoAnalitica'

export interface CategoriaTop {
  id: number
  nombre: string
}

/** Máximo de categorías en la barra del header (después de "Negocio Plus"). */
export const MAXIMO_CATEGORIAS_TOP = 3
const VIGENCIA_MS = 5 * 60_000

export function leerCategoriasTop(data: unknown): CategoriaTop[] {
  if (!Array.isArray(data)) return []
  return data
    .filter((f): f is CategoriaTop =>
      !!f && typeof f === 'object' && typeof (f as CategoriaTop).id === 'number' && typeof (f as CategoriaTop).nombre === 'string')
    .map(({ id, nombre }) => ({ id, nombre }))
    .slice(0, MAXIMO_CATEGORIAS_TOP)
}

/** Hasta 3 categorías raíz: más visitadas en 30 días o, sin datos, con más productos (lo decide el backend). */
export function useCategoriasTop(): CategoriaTop[] {
  const { data } = useQuery({
    queryKey: ['categorias-top'],
    queryFn: () => api.get('/categorias/publicas/top').then((r) => leerCategoriasTop(r.data)),
    staleTime: VIGENCIA_MS,
  })
  return data ?? []
}

const yaContadas = new Set<number>()

/**
 * Suma una visita agregada a la categoría (sin cookie, sin id de visitante, sin storage).
 * Solo con consentimiento de análisis y una vez por categoría por carga de la página.
 */
export function registrarVisitaCategoria(id: number | null | undefined): boolean {
  if (!id || !Number.isInteger(id) || id <= 0) return false
  if (!hayConsentimientoAnalitica() || yaContadas.has(id)) return false
  yaContadas.add(id)
  void api.post(`/public/categorias/${id}/visita`).catch(() => { /* métrica best-effort */ })
  return true
}

export function useVisitaCategoria(id: number | null | undefined): void {
  useEffect(() => { registrarVisitaCategoria(id) }, [id])
}

/** Solo para tests. */
export function reiniciarVisitasContadas(): void {
  yaContadas.clear()
}
