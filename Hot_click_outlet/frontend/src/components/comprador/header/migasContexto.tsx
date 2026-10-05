import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { ExtraMigas } from './migasRuta'

type EstadoMigas = {
  extra: ExtraMigas
  publicar: (valor: ExtraMigas) => void
}

const MigasEstado = createContext<EstadoMigas | null>(null)

export function MigasProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [extra, setExtra] = useState<ExtraMigas>({})
  const ruta = useRef(pathname)
  if (ruta.current !== pathname) {
    ruta.current = pathname
    if (extra.actual || extra.categoriaNombre || extra.categoriaId || extra.nombreTienda) setExtra({})
  }
  const publicar = useCallback((valor: ExtraMigas) => setExtra(valor), [])
  const value = useMemo(() => ({ extra, publicar }), [extra, publicar])
  return <MigasEstado.Provider value={value}>{children}</MigasEstado.Provider>
}

export function useMigasExtra(): ExtraMigas {
  return useContext(MigasEstado)?.extra ?? {}
}

/** La pantalla publica el nombre que la URL no trae (producto, categoría, artículo). */
export function usePublicarMigas(extra: ExtraMigas) {
  const publicar = useContext(MigasEstado)?.publicar
  const actual = extra.actual ?? ''
  const categoriaNombre = extra.categoriaNombre ?? ''
  const categoriaId = extra.categoriaId ?? ''
  const nombreTienda = extra.nombreTienda ?? ''

  useEffect(() => {
    if (!publicar) return
    publicar({
      actual: actual || undefined,
      categoriaNombre: categoriaNombre || undefined,
      categoriaId: categoriaId === '' ? undefined : categoriaId,
      nombreTienda: nombreTienda || undefined,
    })
    return () => publicar({})
  }, [publicar, actual, categoriaNombre, categoriaId, nombreTienda])
}
