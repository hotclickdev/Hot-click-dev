import { Link } from 'react-router-dom'
import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'

const OPCIONES = [
  {
    path: 'productos/nuevo/catalogo',
    titulo: 'Producto de catálogo',
    ayuda: 'Precio fijo, stock y listo para vender (ropa, tech, etc.).',
  },
  {
    path: 'productos/nuevo/personalizado',
    titulo: 'Producto personalizado',
    ayuda: 'Por encargo: el cliente sube fotos y notas (sublimado, arte, manualidades).',
  },
] as const

/**
 * Primer paso al agregar en PYME / Negocio Plus.
 */
export default function ElegirTipoProductoPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Agregar producto" volverA={ruta('productos')} />
      <p className="mb-4 text-sm text-hc-muted">¿Qué tipo de producto querés publicar?</p>
      <div className="flex flex-col gap-3">
        {OPCIONES.map((opcion) => (
          <Link
            key={opcion.path}
            to={ruta(opcion.path)}
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
