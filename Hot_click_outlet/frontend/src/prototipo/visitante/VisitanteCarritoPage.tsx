import { formatoColon } from '@/theme/formatoColon'
import useCartStore from '@/store/cartStore'
import VisitanteMain, {
  VisitanteBoton,
  VisitanteEmptyState,
  VisitantePrecio,
  VisitanteThumb,
  VisitanteTitulo,
} from './VisitantePiezas'
import { COSTO_ENVIO_CRC, visitanteRuta } from './visitanteMock'

type ItemCarrito = {
  id: number | string
  nombre?: string
  nombreProducto?: string
  precio?: number
  precioVenta?: number
  cantidad: number
  imagenUrl?: string
  empresaNombre?: string
}

/**
 * Carrito Visitante (Figma 121:128) con items de cartStore.
 */
export default function VisitanteCarritoPage({ vacio = false }: { vacio?: boolean }) {
  const items = useCartStore((s) => s.items) as ItemCarrito[]
  const totalStore = useCartStore((s) => s.total) as () => number
  const vacioReal = vacio || items.length === 0

  if (vacioReal) {
    return (
      <VisitanteMain>
        <VisitanteTitulo>Tu carrito</VisitanteTitulo>
        <VisitanteEmptyState titulo="Tu carrito está vacío" detalle="Agregá productos y aparecerán acá" />
        <div className="mt-4 flex justify-center">
          <VisitanteBoton to={visitanteRuta('shop')} className="w-auto px-5 py-3 text-[13px]">
            Explorar productos
          </VisitanteBoton>
        </div>
      </VisitanteMain>
    )
  }

  const subtotal = totalStore()
  const total = subtotal + COSTO_ENVIO_CRC

  return (
    <VisitanteMain>
      <VisitanteTitulo>Tu carrito</VisitanteTitulo>
      <ul className="flex flex-col gap-6">
        {items.map((item) => (
          <li key={String(item.id)} className="flex gap-3.5">
            <VisitanteThumb altura="size-16 rounded-[14px]" imagenUrl={item.imagenUrl} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{item.nombre ?? item.nombreProducto}</p>
              <p className="text-[10px] text-hc-muted">{item.empresaNombre ?? 'HotClick'}</p>
              <div className="mt-1 flex items-center justify-between">
                <VisitantePrecio colones={item.precio ?? item.precioVenta ?? 0} />
                <span className="rounded-full bg-[var(--hc-blue-50)] px-2.5 py-1 text-[10px] font-bold text-hc-accent">
                  x{item.cantidad}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <hr className="my-6 border-hc-border" />
      <FilaResumen etiqueta="Subtotal" valor={subtotal} />
      <FilaResumen etiqueta="Envío" valor={COSTO_ENVIO_CRC} />
      <div className="mb-6 mt-3 flex items-center justify-between text-[15px] font-bold">
        <span>Total</span>
        <VisitantePrecio colones={total} className="text-[15px]" />
      </div>
      <VisitanteBoton to={visitanteRuta('checkout')} dataMm="vis-carrito-pagar">Ir a pagar</VisitanteBoton>
    </VisitanteMain>
  )
}

function FilaResumen({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="mb-3 flex items-center justify-between text-[13px]">
      <span className="text-hc-muted">{etiqueta}</span>
      <span className="font-medium text-hc-text">{formatoColon(valor)}</span>
    </div>
  )
}
