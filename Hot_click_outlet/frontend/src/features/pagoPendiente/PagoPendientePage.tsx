import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatPrice } from '@/utils/format'
import { INTERVALO_CONSULTA_MS, pagoPendienteApi, type PagoPendiente } from './pagoPendienteApi'
import { TEXTOS_PAGO_PENDIENTE as T, textoAvisoCorreo, textoProductos, textoReservadoHasta } from './textosPagoPendiente'
import { REL_SIN_REFERRER, ponerMetaNoReferrer, tokenEstadoPago, urlSinToken } from './privacidadToken'

function storageSeguro(): Storage | null {
  try { return globalThis.sessionStorage ?? null } catch { return null }
}

/**
 * S4-22 · Pantalla «Pago pendiente» SINPE de ONVO (láminas pago-pendiente-sinpe-390/1440). Una acción por pantalla.
 * Contrato real de #207: el token es `estadoPagoToken` del checkout; sin plazo configurado `reservadoHasta` es null y no se
 * muestra ningún plazo. Un 404 (enlace que no vale) corta las consultas.
 */
export default function PagoPendientePage() {
  const { numero = '' } = useParams()
  const [token] = useState(() => tokenEstadoPago(numero, globalThis.location?.search ?? '', storageSeguro()))
  const [pago, setPago] = useState<PagoPendiente | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => ponerMetaNoReferrer(document), [])
  useEffect(() => {
    const { pathname, search, hash } = globalThis.location
    if (new URLSearchParams(search).has('token')) globalThis.history.replaceState(globalThis.history.state, '', urlSinToken(pathname, search, hash))
  }, [])

  useEffect(() => {
    let vivo = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const consultar = () => {
      pagoPendienteApi.estado(numero, token)
        .then((p) => {
          if (!vivo) return
          setPago(p); setError(null)
          if (p.estado === 'PENDIENTE') timer = setTimeout(consultar, INTERVALO_CONSULTA_MS)
        })
        .catch((e: unknown) => {
          if (!vivo) return
          const r = (e as { response?: { status?: number; data?: { message?: unknown } } }).response
          if (r?.status === 404) { setError(typeof r.data?.message === 'string' ? r.data.message : T.enlaceInvalido); return }
          setError(T.reintentando); timer = setTimeout(consultar, INTERVALO_CONSULTA_MS)
        })
    }
    consultar()
    return () => { vivo = false; if (timer) clearTimeout(timer) }
  }, [numero, token])

  if (!pago) {
    return <main className="mx-auto max-w-[480px] p-6 text-[14px]">{error ? <p role="alert">{error}</p> : <p aria-busy="true">Cargando…</p>}</main>
  }

  const resumen = (
    <section aria-label="Resumen del pedido" className="flex flex-col gap-2 rounded-[16px] border border-hc-border bg-hc-surface p-4 text-[14px]">
      <b>Pedido #{pago.numero} · {pago.tienda}</b>
      <div className="flex justify-between"><span>{textoProductos(pago.cantidadProductos)}</span><span>{formatPrice(pago.subtotal)}</span></div>
      {pago.envioEtiqueta && <div className="flex justify-between"><span>{pago.envioEtiqueta}</span><span>{formatPrice(pago.envio)}</span></div>}
      <div className="flex justify-between border-t border-hc-border pt-2 font-bold"><span>Total</span><span>{formatPrice(pago.total)}</span></div>
    </section>
  )

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-[480px] flex-col gap-3 px-4 py-6">
      {pago.estado === 'VENCIDO' ? (
        <p role="alert" className="rounded-[12px] border border-hc-danger/30 bg-hc-danger-bg px-4 py-3 text-[14px] text-hc-danger"><b>{T.vencidoTitulo}</b> {T.vencidoTexto}</p>
      ) : (
        <section className="flex flex-col items-center gap-3 rounded-[16px] border border-hc-border bg-hc-surface p-5 text-center" aria-live="polite">
          <h1 className="font-display text-[22px] font-bold">{pago.estado === 'CONFIRMADO' ? T.confirmado : T.titulo}</h1>
          {pago.estado === 'PENDIENTE' && (<>
            <p className="text-[14px] text-hc-muted">{T.verificando}</p>
            <p className="rounded-[12px] border border-hc-blue-600/20 bg-hc-blue-50 px-4 py-3 text-left text-[13px]"><b>Te avisamos por correo</b> {textoAvisoCorreo(pago.correo)}</p>
            {pago.reservadoHasta && <p className="text-[13px]">Reservado hasta: <span className="font-semibold text-hc-warning">{textoReservadoHasta(pago.reservadoHasta)}</span></p>}
          </>)}
        </section>
      )}
      {resumen}
      <div className="sticky bottom-0 mt-auto bg-hc-bg py-3">
        {pago.estado === 'VENCIDO'
          ? <Link to="/carrito" rel={REL_SIN_REFERRER} className="flex min-h-12 items-center justify-center rounded-xl bg-hc-primary text-[15px] font-bold text-white">Volver a pagar · {formatPrice(pago.total)}</Link>
          : <Link to="/mis-pedidos" rel={REL_SIN_REFERRER} className="flex min-h-12 items-center justify-center rounded-xl border border-hc-blue-600 text-[15px] font-semibold text-hc-blue-600">Ver mi pedido</Link>}
      </div>
    </main>
  )
}
