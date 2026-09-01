import { Link } from 'react-router-dom'
import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR } from '../constants'

const OPCIONES = [
  {
    to: `${RUTA_EMPRENDEDOR}/productos/nuevo/catalogo`,
    titulo: 'Producto de catálogo',
    ayuda: 'Precio fijo, stock y listo para vender (ropa, tech, etc.).',
  },
  {
    to: `${RUTA_EMPRENDEDOR}/productos/nuevo/personalizado`,
    titulo: 'Producto personalizado',
    ayuda: 'Por encargo: el cliente sube fotos y notas (sublimado, arte, manualidades).',
  },
] as const

/**
 * Primer paso al agregar: elegir producto normal o personalizado.
 */
export default function ElegirTipoProductoPage() {
  return (
    <main className="flex flex-col gap-6 px-5 py-8">
      <CabeceraAtras titulo="Agregar producto" to={`${RUTA_EMPRENDEDOR}/productos`} />
      <p className="text-sm text-hc-muted">¿Qué tipo de producto querés publicar?</p>
      <div className="flex flex-col gap-3">
        {OPCIONES.map((opcion) => (
          <Link
            key={opcion.to}
            to={opcion.to}
            className="rounded-2xl border border-hc-border bg-hc-surface px-4 py-4 text-left transition hover:border-hc-primary"
            data-mm="seller-elegir-tipo-producto"
          >
            <span className="block text-[15px] font-bold text-hc-text">{opcion.titulo}</span>
            <span className="mt-1 block text-xs text-hc-muted">{opcion.ayuda}</span>
          </Link>
        ))}
      </div>
    </main>
  )
}
