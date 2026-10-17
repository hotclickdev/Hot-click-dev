import { useEffect, useState } from 'react'
import { formatPrice } from '@/utils/format'
import { estadoTiendaApi, textoDiasGracia, textoPedidosEnCurso, type EstadoTienda } from './estadoTiendaApi'

/**
 * Vendedor (Pyme / Negocio Plus; Emprendedor no aplica): chip «Pausada», alerta con los días de gracia
 * tal como vienen del backend, pedidos en curso y «Completar pago · {monto del plan}».
 */
export default function PanelTiendaPausada() {
  const [estado, setEstado] = useState<EstadoTienda | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    estadoTiendaApi.obtener().then((e) => { if (vivo) setEstado(e) }).catch(() => { /* sin estado: no se muestra nada */ })
    return () => { vivo = false }
  }, [])

  if (!estado) return null
  if (estado.estado === 'ACTIVA') {
    return estado.reactivada
      ? <p role="status" className="rounded-[12px] bg-hc-success-bg px-3.5 py-3 text-[13px] font-semibold text-hc-success-text">Tu tienda está activa otra vez.</p>
      : null
  }

  async function pagar() {
    setOcupado(true); setError(null)
    try {
      const url = await estadoTiendaApi.pagarMensualidad()
      if (url) window.location.assign(url)
      else setError('No pudimos abrir el pago. Probá de nuevo en unos minutos.')
    } catch {
      setError('No pudimos abrir el pago. Probá de nuevo en unos minutos.')
    } finally { setOcupado(false) }
  }

  const plan = estado.plan ? `tu plan ${estado.plan}` : 'tu plan'
  const monto = estado.montoMensualidad != null ? formatPrice(estado.montoMensualidad) : null
  return (
    <section aria-label="Tienda pausada" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[18px] font-bold">Mi tienda</h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-hc-danger/30 bg-hc-danger-bg px-2.5 py-0.5 text-[12px] font-semibold text-hc-danger">● Pausada</span>
      </div>
      <div role="alert" className="rounded-[12px] border border-hc-danger/30 bg-hc-danger-bg px-3.5 py-3 text-[13px] text-hc-danger">
        <b className="mb-1 block">Completá el pago para reactivar tu tienda.</b>
        Tu tienda está pausada porque no se completó el pago de {plan}{monto ? ` (${monto})` : ''} al terminar el período de gracia ({textoDiasGracia(estado.diasGracia)}). Las ventas que ya tenías siguen válidas. Desde el día siguiente tus productos se ven como AGOTADO u ocultos y no se muestran tus redes ni el botón de compartir.
      </div>
      <div className="rounded-[12px] border border-hc-border bg-hc-surface p-4 text-[13px]">
        <b className="block">Pedidos en curso</b>
        {textoPedidosEnCurso(estado.pedidosEnCurso)}
      </div>
      {monto && (
        <div className="rounded-[12px] border border-hc-border bg-hc-surface p-4">
          <b className="block text-[13px]">Mensualidad por pagar</b>
          <p className="font-display text-[28px] font-bold">{monto}</p>
          {estado.plan && <p className="text-[12px] text-hc-muted">Plan {estado.plan}</p>}
        </div>
      )}
      {error && <p role="alert" className="text-[13px] text-hc-danger">{error}</p>}
      <button type="button" disabled={ocupado} onClick={() => void pagar()} className="flex min-h-12 items-center justify-center rounded-xl bg-hc-primary px-4 text-[15px] font-bold text-white disabled:opacity-60">
        {monto ? `Completar pago · ${monto}` : 'Completar pago'}
      </button>
    </section>
  )
}
