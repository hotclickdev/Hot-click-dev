import { formatoColon } from '@/theme/formatoColon'
import { Boton, EncabezadoPagina, Miniatura } from './ui'
import { useSellerRuta } from './SellerPlanContext'

/**
 * Carrito de la tienda pública (Figma 61:562).
 */
export default function CarritoPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Tu carrito" volverA={ruta('tienda')} />
      <div className="flex gap-3">
        <Miniatura className="size-16" />
        <div>
          <p className="text-sm font-medium">Auriculares Bluetooth X200</p>
          <p className="text-xs text-hc-muted">Cantidad: 1</p>
          <p className="mt-1 text-sm font-bold">{formatoColon(18500)}</p>
        </div>
      </div>
      <hr className="my-5 border-hc-border" />
      <FilaTotal label="Subtotal" valor={18500} />
      <FilaTotal label="Envío" valor={2000} />
      <FilaTotal label="Total" valor={20500} destacado />
      <div className="mt-6">
        <Boton to={ruta('compra-ok')}>Confirmar compra</Boton>
      </div>
    </main>
  )
}

function FilaTotal({ label, valor, destacado = false }: { label: string; valor: number; destacado?: boolean }) {
  return (
    <div className={`flex justify-between ${destacado ? 'text-base font-bold' : 'text-sm'}`}>
      <span>{label}</span>
      <span>{formatoColon(valor)}</span>
    </div>
  )
}
