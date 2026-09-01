import BotonesAgregarProducto from '@/prototipo/compartido/BotonesAgregarProducto'
import { RUTA_EMPRENDEDOR } from '../constants'

/**
 * Empty state de productos (Figma 155:540). Ruta dedicada para el mock.
 */
export default function ProductosVacioPage() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col px-5 py-8">
      <h1 className="font-display text-[22px] font-bold">Mis Productos</h1>
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center"
        data-mm="seller-lista-productos"
      >
        <div className="flex size-[72px] items-center justify-center rounded-full bg-[var(--hc-n-100)] text-2xl font-bold text-hc-muted">
          —
        </div>
        <p className="text-[15px] font-bold">Todavía no subiste productos</p>
        <p className="text-xs text-hc-muted">Agregá tu primer producto para empezar a vender</p>
        <BotonesAgregarProducto baseNuevo={`${RUTA_EMPRENDEDOR}/productos/nuevo`} />
      </div>
    </main>
  )
}
