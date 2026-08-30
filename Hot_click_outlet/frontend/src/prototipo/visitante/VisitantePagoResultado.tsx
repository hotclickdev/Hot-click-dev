import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { usePayment } from '@/hooks/usePayment'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { formatoColon } from '@/theme/formatoColon'
import {
  estaOcupado,
  leerParamsPago,
  mensajeCargaPago,
  pedidoDesdeBusqueda,
  subtituloPendiente,
  tituloPendiente,
  type PagoResumen,
} from '@/pages/pago/pagoHelpers'
import VisitanteMain, { VisitanteBoton } from './VisitantePiezas'
import { IconoAlerta, IconoCheck, IconoEscudo } from './VisitanteIcons'
import { WHATSAPP_HOTCLICK, visitanteRuta } from './visitanteMock'
import { limpiarRetornoPagoVisitante } from './pagoRetornoVisitante'

const WA = `https://wa.me/${WHATSAPP_HOTCLICK}`

/**
 * Mismo flujo de polling/cancelación que PaymentStatusPage, chrome Visitante.
 */
export default function VisitantePagoResultado() {
  const [params] = useSearchParams()
  const { pathname, search } = useLocation()
  const { stripeApproved, esCancelacion } = leerParamsPago(params, pathname)
  const numeroPedido = pedidoDesdeBusqueda(search)
  const { clearCart } = useCartStore()
  const { token } = useAuthStore()
  const { estado, pagoData, error, iniciarPolling, stopPolling, cancelarPedido } = usePayment()
  const ran = useRef(false)

  useEffect(() => {
    limpiarRetornoPagoVisitante()
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  useEffect(() => {
    globalThis.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    if (estado === 'success') clearCart()
  }, [estado, clearCart])

  useEffect(() => {
    if (!numeroPedido || ran.current) return
    ran.current = true
    if (esCancelacion) {
      cancelarPedido(numeroPedido)
      return
    }
    iniciarPolling(numeroPedido)
  }, [numeroPedido, esCancelacion, cancelarPedido, iniciarPolling])

  if (!numeroPedido) {
    return (
      <VisitanteEstadoError
        error="No encontramos el número de pedido en el enlace de retorno."
      />
    )
  }

  if (estaOcupado(estado)) {
    return <VisitanteEstadoCarga estado={estado} stripeApproved={stripeApproved} />
  }

  if (estado === 'success') {
    return (
      <VisitanteEstadoExito
        pagoData={pagoData as PagoResumen | null}
        numeroPedido={numeroPedido}
        token={token}
      />
    )
  }

  if (estado === 'cancelled') return <VisitanteEstadoCancelado />

  if (estado === 'timeout') {
    return (
      <VisitanteEstadoPendiente
        pagoData={pagoData as PagoResumen | null}
        stripeApproved={stripeApproved}
      />
    )
  }

  return <VisitanteEstadoError error={error} />
}

function VisitanteEstadoCarga({
  estado,
  stripeApproved,
}: {
  estado: string
  stripeApproved: boolean
}) {
  return (
    <VisitanteMain conNav={false} className="flex flex-col items-center pt-16 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-[var(--hc-blue-50)] text-hc-accent">
        <IconoEscudo className="size-8 animate-pulse" />
      </div>
      <h1 className="font-display text-xl font-bold">¡Gracias por tu compra!</h1>
      <p className="mt-2 text-sm text-hc-muted">{mensajeCargaPago(estado, stripeApproved)}</p>
      <p className="mt-6 text-xs text-hc-muted">Esto puede tardar unos segundos…</p>
    </VisitanteMain>
  )
}

function VisitanteEstadoExito({
  pagoData,
  numeroPedido,
  token,
}: {
  pagoData: PagoResumen | null
  numeroPedido: string
  token: string | null
}) {
  const pedido = pagoData?.numeroPedido || numeroPedido
  return (
    <VisitanteMain conNav={false} className="pt-10 text-center">
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
        <IconoCheck className="size-8" />
      </div>
      <h1 className="font-display text-2xl font-bold">Compra confirmada</h1>
      <p className="mt-2 text-sm text-hc-muted">Tu pago se registró correctamente.</p>
      <ResumenPedido pagoData={pagoData} pedidoFallback={pedido} />
      <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-left">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
          <IconoEscudo className="size-4 shrink-0" />
          Tu garantía de 40 días está activa
        </p>
        <p className="mt-1 text-xs text-hc-muted">Si tenés un problema, escribinos por WhatsApp.</p>
      </div>
      <p className="mt-4 text-xs text-hc-muted">
        Recibirás un correo de confirmación. ¿Dudas? Contáctanos por WhatsApp.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {token ? (
          <VisitanteBoton to={visitanteRuta('pedidos')}>Ver mis pedidos</VisitanteBoton>
        ) : (
          <VisitanteBoton to={visitanteRuta('shop')}>Seguir comprando</VisitanteBoton>
        )}
        <VisitanteBoton to={visitanteRuta()} variant="ghost">
          Ir al inicio
        </VisitanteBoton>
        {!token ? (
          <a href={WA} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-hc-muted">
            Consultar mi pedido por WhatsApp
          </a>
        ) : null}
      </div>
    </VisitanteMain>
  )
}

function ResumenPedido({
  pagoData,
  pedidoFallback,
}: {
  pagoData: PagoResumen | null
  pedidoFallback: string
}) {
  if (!pagoData && !pedidoFallback) return null
  return (
    <div className="mt-6 space-y-2 rounded-2xl border border-hc-border bg-hc-surface p-4 text-left text-sm">
      <Fila etiqueta="Pedido" valor={pagoData?.numeroPedido || pedidoFallback} mono />
      {pagoData?.total != null ? (
        <Fila etiqueta="Total pagado" valor={formatoColon(pagoData.total)} destacado />
      ) : null}
      {pagoData?.metodoPago ? <Fila etiqueta="Método" valor={pagoData.metodoPago} /> : null}
      {pagoData?.cardLast4 ? (
        <Fila
          etiqueta="Tarjeta"
          valor={`${pagoData.cardBrand ?? ''} •••• ${pagoData.cardLast4}`.trim()}
        />
      ) : null}
    </div>
  )
}

function Fila({
  etiqueta,
  valor,
  mono,
  destacado,
}: {
  etiqueta: string
  valor: string
  mono?: boolean
  destacado?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-hc-muted">{etiqueta}</span>
      <span
        className={`${mono ? 'font-mono' : ''} ${destacado ? 'font-bold text-hc-primary' : 'font-medium text-hc-text'}`}
      >
        {valor}
      </span>
    </div>
  )
}

function VisitanteEstadoCancelado() {
  return (
    <VisitanteMain conNav={false} className="pt-10 text-center">
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
        <IconoAlerta className="size-8" />
      </div>
      <h1 className="font-display text-2xl font-bold">Pago cancelado</h1>
      <p className="mt-2 text-sm text-hc-muted">No se cobró nada. Podés intentar de nuevo cuando quieras.</p>
      <div className="mt-8 flex flex-col gap-3">
        <VisitanteBoton to={visitanteRuta('checkout')}>Reintentar pago</VisitanteBoton>
        <VisitanteBoton to={visitanteRuta('carrito')} variant="ghost">
          Volver al carrito
        </VisitanteBoton>
      </div>
    </VisitanteMain>
  )
}

function VisitanteEstadoPendiente({
  pagoData,
  stripeApproved,
}: {
  pagoData: PagoResumen | null
  stripeApproved: boolean
}) {
  return (
    <VisitanteMain conNav={false} className="pt-10 text-center">
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
        <IconoAlerta className="size-8" />
      </div>
      <h1 className="font-display text-2xl font-bold">{tituloPendiente(stripeApproved)}</h1>
      <p className="mt-2 text-sm text-hc-muted">{subtituloPendiente(stripeApproved)}</p>
      {pagoData?.numeroPedido ? (
        <div className="mt-6 rounded-2xl border border-hc-border bg-hc-surface p-3 text-sm">
          <span className="text-hc-muted">Pedido: </span>
          <span className="font-mono font-medium">{pagoData.numeroPedido}</span>
        </div>
      ) : null}
      <div className="mt-8 flex flex-col gap-3">
        <VisitanteBoton to={visitanteRuta('pedidos')}>Ver mis pedidos</VisitanteBoton>
        <a href={WA} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-hc-muted">
          Contactar soporte por WhatsApp
        </a>
      </div>
    </VisitanteMain>
  )
}

function VisitanteEstadoError({ error }: { error: string | null }) {
  return (
    <VisitanteMain conNav={false} className="pt-10 text-center">
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-red-500/15 text-hc-danger">
        <IconoAlerta className="size-8" />
      </div>
      <h1 className="font-display text-2xl font-bold">Pago no completado</h1>
      <p className="mt-2 text-sm text-hc-muted">
        {error || 'Tu tarjeta no fue cargada. Podés intentarlo nuevamente.'}
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <VisitanteBoton to={visitanteRuta('checkout')}>Reintentar pago</VisitanteBoton>
        <VisitanteBoton to={visitanteRuta('carrito')} variant="ghost">
          Volver al carrito
        </VisitanteBoton>
      </div>
    </VisitanteMain>
  )
}
