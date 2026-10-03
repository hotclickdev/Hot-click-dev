import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { VarianteContext, varianteDeRuta, type VariantePieza } from './varianteVisitante'

/** Va dentro de `BrowserRouter`, en `App`: calcula la variante de las piezas compartidas para la ruta actual. */
export function VarianteVisitanteProvider({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation()
  const rol = useAuthStore((s) => s.userRole)
  const variante = varianteDeRuta(pathname, rol)
  return <VarianteContext.Provider value={variante}>{children}</VarianteContext.Provider>
}

/**
 * Fija la variante de un subárbol. Para flujos de vendedor que viven en una ruta de visitante
 * (p. ej. el alta de emprendimiento dentro de `/registro`): quedan con el estilo de siempre.
 */
export function VariantePiezaFija({ variante, children }: { variante: VariantePieza; children?: ReactNode }) {
  return <VarianteContext.Provider value={variante}>{children}</VarianteContext.Provider>
}
