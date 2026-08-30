import { Link } from 'react-router-dom'
import TiendaPlaceholder from './TiendaPlaceholder'

/** Vacío de tienda pública sin catálogo: tienda nueva, no catálogo roto. */
export default function TiendaCatalogoNuevo({ nombre }: { nombre: string }) {
  return (
    <div className="text-center py-16 px-4">
      <TiendaPlaceholder className="mx-auto h-12 w-12 mb-4 text-[var(--t-muted)]" />
      <h1 className="text-xl font-bold text-[var(--t-text)]">Esta tienda está empezando</h1>
      <p className="text-sm mt-2 max-w-md mx-auto text-[var(--t-muted)] leading-relaxed">
        {nombre} ya está en HotClick. El catálogo se publica acá cuando haya productos.
      </p>
      <Link
        to="/productos"
        className="inline-flex items-center justify-center mt-6 px-5 min-h-11 rounded-lg text-white text-sm font-semibold"
        style={{ backgroundColor: 'var(--t-primary)' }}
      >
        Ver productos en HotClick
      </Link>
    </div>
  )
}
