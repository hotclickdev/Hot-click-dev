import MarcoVentas from '@/prototipo/compartido/MarcoVentas'
import EncargosPanel from '@/features/encargos/EncargosPanel'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'

/**
 * Ventas / encargos — misma cabecera que Pedidos.
 */
export default function EncargosPage() {
  return (
    <main className="flex flex-col gap-4 px-5 py-8 md:max-w-[760px] md:px-16 md:py-12">
      <EntradaPagina className="flex flex-col gap-4">
        <MarcoVentas lado="encargos" />
        <EncargosPanel apariencia="venta" />
      </EntradaPagina>
    </main>
  )
}
