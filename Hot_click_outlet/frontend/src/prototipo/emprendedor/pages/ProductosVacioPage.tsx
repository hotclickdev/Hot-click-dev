import BotonesAgregarProducto from '@/prototipo/compartido/BotonesAgregarProducto'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import EstadoVacioConversacional from '@/prototipo/compartido/motion/EstadoVacioConversacional'
import { RUTA_EMPRENDEDOR } from '../constants'

/**
 * Empty state de productos (Figma 155:540). Ruta dedicada para el mock.
 */
export default function ProductosVacioPage() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col px-5 py-8">
      <EntradaPagina className="flex flex-1 flex-col">
        <h1 className="font-display text-[22px] font-bold">Mis Productos</h1>
        <div className="flex flex-1 flex-col justify-center" data-mm="seller-lista-productos">
          <EstadoVacioConversacional
            titulo="Todavía no subiste productos"
            mensaje="Agregá tu primer producto para empezar a vender"
            accion={<BotonesAgregarProducto baseNuevo={`${RUTA_EMPRENDEDOR}/productos/nuevo`} />}
          />
        </div>
      </EntradaPagina>
    </main>
  )
}
