import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import VisitanteMain, { VisitanteBackHeader, VisitanteBoton, VisitanteChip, VisitantePrecio } from './VisitantePiezas'
import { COSTO_ENVIO_CRC, subtotalCarrito, visitanteRuta } from './visitanteMock'

const METODOS = ['Tarjeta', 'SINPE', 'Contra entrega'] as const

/**
 * Checkout Visitante (Figma 131:288).
 */
export default function VisitanteCheckoutPage() {
  const [metodo, setMetodo] = useState<(typeof METODOS)[number]>('Tarjeta')
  const subtotal = subtotalCarrito()
  const total = subtotal + COSTO_ENVIO_CRC

  return (
    <VisitanteMain conNav={false}>
      <VisitanteBackHeader titulo="Checkout" to={visitanteRuta('carrito')} />
      <Campo etiqueta="Dirección de envío" valor="San José, Costa Rica" />
      <Campo etiqueta="Teléfono de contacto" valor="+506 8888-0000" />
      <p className="mb-2 text-xs font-medium text-hc-muted">Método de pago</p>
      <div className="mb-5 flex gap-2">
        {METODOS.map((item) => (
          <VisitanteChip key={item} activo={metodo === item} onClick={() => setMetodo(item)}>
            {item}
          </VisitanteChip>
        ))}
      </div>
      <hr className="mb-4 border-hc-border" />
      <Fila etiqueta="Subtotal" valor={formatoColon(subtotal)} />
      <Fila etiqueta="Envío" valor={formatoColon(COSTO_ENVIO_CRC)} />
      <div className="mb-6 flex items-center justify-between text-[15px] font-bold">
        <span>Total</span>
        <VisitantePrecio colones={total} className="text-[15px]" />
      </div>
      <VisitanteBoton to={visitanteRuta('compra-confirmada')}>Confirmar y pagar</VisitanteBoton>
      <p className="mt-4 text-center">
        <Link to={visitanteRuta('pago-fallido')} className="text-xs text-hc-muted">
          Simular pago rechazado
        </Link>
      </p>
    </VisitanteMain>
  )
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <label className="mb-5 block">
      <span className="mb-2 block text-xs font-medium text-hc-muted">{etiqueta}</span>
      <span className="block rounded-xl bg-[var(--hc-n-100)] p-3.5 text-sm font-medium">{valor}</span>
    </label>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="mb-3 flex items-center justify-between text-[13px]">
      <span className="text-hc-muted">{etiqueta}</span>
      <span className="font-medium">{valor}</span>
    </div>
  )
}
