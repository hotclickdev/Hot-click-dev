import { formatoColon } from '@/theme/formatoColon'
import VisitanteMain, {
  VisitanteBoton,
  VisitanteEmptyState,
  VisitantePrecio,
  VisitanteThumb,
  VisitanteTitulo,
} from './VisitantePiezas'
import { COSTO_ENVIO_CRC, lineasCarrito, subtotalCarrito, visitanteRuta } from './visitanteMock'

/**
 * Carrito Visitante (Figma 121:128) y vacío (131:336).
 */
export default function VisitanteCarritoPage({ vacio = false }: { vacio?: boolean }) {
  if (vacio) {
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

  const lineas = lineasCarrito()
  const subtotal = subtotalCarrito()
  const total = subtotal + COSTO_ENVIO_CRC

  return (
    <VisitanteMain>
      <VisitanteTitulo>Tu carrito</VisitanteTitulo>
      <ul className="flex flex-col gap-6">
        {lineas.map((item) => (
          <li key={item.id} className="flex gap-3.5">
            <VisitanteThumb altura="size-16 rounded-[14px]" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{item.nombre}</p>
              <p className="text-[10px] text-hc-muted">{item.negocio}</p>
              <div className="mt-1 flex items-center justify-between">
                <VisitantePrecio colones={item.precio} />
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
      <VisitanteBoton to={visitanteRuta('checkout')}>Ir a pagar</VisitanteBoton>
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
