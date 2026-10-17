import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { formatPrice } from '@/utils/format'
import { INTERVALO_CONSULTA_MS, pagoPendienteApi, type PagoPendiente } from './pagoPendienteApi'
import { PLAZO_POR_CONFIRMAR, TEXTOS_PAGO_PENDIENTE as T, textoAvisoCorreo, textoProductos } from './textosPagoPendiente'

/** S4-22 · Pantalla «Pago pendiente» SINPE (láminas pago-pendiente-sinpe-390/1440). Una acción por pantalla. */
export default function PagoPendientePage() {
  const { numero = '' } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [pago, setPago] = useState<PagoPendiente | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let vivo = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const consultar = () => {
      pagoPendienteApi.estado(numero, token)
        .then((p) => {
          if (!vivo) return
          setPago(p); setError(false)
          if (p.estado === 'PENDIENTE') timer = setTimeout(consultar, INTERVALO_CONSULTA_MS)
        })
        .catch(() => { if (vivo) { setError(true); timer = setTimeout(consultar, INTERVALO_CONSULTA_MS) } })
    }
    consultar()
    return () => { vivo = false; if (timer) clearTimeout(timer) }
  }, [numero, token])

  if (!pago) {
    return <main className="mx-auto max-w-[480px] p-6 text-[14px]">{error ? <p role="alert">No pudimos consultar tu pago. Probamos de nuevo en unos segundos.</p> : <p aria-busy="true">Cargando…</p>}</main>
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
            <p className="text-[13px]">Reservado hasta: <span className="font-semibold text-hc-warning">{pago.reservadoHasta ?? PLAZO_POR_CONFIRMAR}</span></p>
          </>)}
        </section>
      )}
      {resumen}
      <div className="sticky bottom-0 mt-auto bg-hc-bg py-3">
        {pago.estado === 'VENCIDO'
          ? <Link to="/carrito" className="flex min-h-12 items-center justify-center rounded-xl bg-hc-primary text-[15px] font-bold text-white">Volver a pagar · {formatPrice(pago.total)}</Link>
          : <Link to={token ? `/seguimiento/${encodeURIComponent(token)}` : '/mis-pedidos'} className="flex min-h-12 items-center justify-center rounded-xl border border-hc-blue-600 text-[15px] font-semibold text-hc-blue-600">Ver mi pedido</Link>}
      </div>
    </main>
  )
}
