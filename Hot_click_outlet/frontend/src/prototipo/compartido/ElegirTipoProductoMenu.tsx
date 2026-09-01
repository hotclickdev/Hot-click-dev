import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const OPCIONES = [
  {
    path: 'catalogo',
    titulo: 'Producto de catálogo',
    ayuda: 'Precio fijo, stock y listo para vender (ropa, tech, etc.).',
  },
  {
    path: 'personalizado',
    titulo: 'Producto personalizado',
    ayuda: 'Por encargo: sin precio fijo; el cliente pide y vos cotizás después.',
  },
] as const

type Props = Readonly<{
  baseNuevo: string
  cabecera?: ReactNode
}>

/**
 * Primer paso al agregar: catálogo vs personalizado.
 */
export default function ElegirTipoProductoMenu({ baseNuevo, cabecera }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {cabecera}
      <p className="text-sm text-hc-muted">¿Qué tipo de producto querés publicar?</p>
      <div className="flex flex-col gap-3">
        {OPCIONES.map((opcion) => (
          <Link
            key={opcion.path}
            to={`${baseNuevo}/${opcion.path}`}
            className="rounded-2xl border border-hc-border bg-hc-surface px-4 py-4 text-left transition hover:border-hc-primary"
            data-mm="seller-elegir-tipo-producto"
          >
            <span className="block text-[15px] font-bold text-hc-text">{opcion.titulo}</span>
            <span className="mt-1 block text-xs text-hc-muted">{opcion.ayuda}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
