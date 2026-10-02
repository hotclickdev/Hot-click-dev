import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type Acceso = {
  to: string
  texto: string
  detalle?: string
  icono: ReactNode
  /** Contador a la derecha (pedidos activos, solicitudes). Se oculta en 0. */
  cantidad?: number
}

type ListaAccesosProps = {
  accesos: Acceso[]
  etiqueta?: string
  /**
   * `chevron` (por defecto): fila con detalle, contador y flecha (Mi cuenta, `28:1196`).
   * `plana`: fila de una línea sin flecha, íconos de 18 px (404, `45:2198`).
   */
  variante?: 'chevron' | 'plana'
}

/** Lista de accesos con filas separadas por línea (Figma `45:2198`, `28:1196`). */
export default function ListaAccesos({ accesos, etiqueta, variante = 'chevron' }: ListaAccesosProps) {
  if (variante === 'plana') return <ListaPlana accesos={accesos} etiqueta={etiqueta} />
  return (
    <nav aria-label={etiqueta} className="w-full overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0">
      <ul>
        {accesos.map((a, i) => (
          <li key={a.to} className={i > 0 ? 'border-t border-hc-n-200' : ''}>
            <Link to={a.to} className="flex min-h-12 items-center gap-3 px-4 py-3 text-left hover:bg-hc-n-50">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-hc-blue-600" aria-hidden="true">{a.icono}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[14px] font-medium text-hc-n-900">{a.texto}</span>
                {a.detalle && <span className="text-[12px] text-hc-n-500">{a.detalle}</span>}
              </span>
              {a.cantidad ? (
                <span className="rounded-full bg-hc-blue-50 px-2 py-0.5 text-[12px] font-semibold text-hc-blue-600">{a.cantidad}</span>
              ) : null}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-hc-n-500" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Figma `45:2198`: filas de 14/13 px de relleno, ícono de 18 y texto Medium 14. */
function ListaPlana({ accesos, etiqueta }: { accesos: Acceso[]; etiqueta?: string }) {
  return (
    <nav aria-label={etiqueta} className="w-full overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0">
      <ul>
        {accesos.map((a, i) => (
          <li key={a.to} className={i > 0 ? 'border-t border-hc-n-200' : ''}>
            <Link to={a.to} className="flex items-center gap-3 px-[14px] py-[13px] text-left hover:bg-hc-n-50">
              <span className="flex size-[18px] shrink-0 items-center justify-center" aria-hidden="true">{a.icono}</span>
              <span className="min-w-0 flex-1 text-[14px] font-medium leading-[normal] text-hc-n-900">{a.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
