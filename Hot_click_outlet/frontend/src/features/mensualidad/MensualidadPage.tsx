import { useEffect, useState } from 'react'
import { formatPrice } from '@/utils/format'
import { Boton, EncabezadoPagina } from '@/prototipo/compartido/ui'
import { useSellerRuta } from '@/prototipo/compartido/SellerPlanContext'
import { FECHA_POR_DEFINIR, VISTA_ESTADO, mensualidadApi, textoAviso, type Mensualidad } from './mensualidadApi'

const CAJA = { info: 'bg-hc-blue-50 border-hc-blue-600/20', aviso: 'bg-hc-warning-bg border-hc-warning/30', mal: 'bg-hc-danger-bg border-hc-danger/30 text-hc-danger' }

/** S4-24 · «Mi plan»: próxima mensualidad y estado (Activo / Pendiente de pago / En gracia). Solo Pyme y Negocio Plus. */
export default function MensualidadPage() {
  const ruta = useSellerRuta()
  const [m, setM] = useState<Mensualidad | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    mensualidadApi.obtener().then((x) => { if (vivo) setM(x) }).catch(() => { if (vivo) setError('No pudimos cargar tu plan. Probá de nuevo en unos minutos.') })
    return () => { vivo = false }
  }, [])

  async function pagar() {
    setOcupado(true); setError(null)
    try {
      const url = await mensualidadApi.pagar()
      if (url) window.location.assign(url); else setError('No pudimos abrir el pago. Probá de nuevo en unos minutos.')
    } catch { setError('No pudimos abrir el pago. Probá de nuevo en unos minutos.') } finally { setOcupado(false) }
  }

  const v = m ? VISTA_ESTADO[m.estado] : null
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col gap-3 px-4 pb-6">
      <EncabezadoPagina titulo="Mi plan" />
      {error && <p role="alert" className="text-[13px] text-hc-danger">{error}</p>}
      {m && v && (<>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold">Mi plan</h2>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${v.clase}`}>● {v.chip}</span>
        </div>
        <section className="rounded-[16px] border border-hc-border bg-hc-surface p-4">
          <p className="text-[12px] text-hc-muted">Plan {m.plan}</p>
          <p className="text-[12px] text-hc-muted">{v.etiquetaMonto}</p>
          <p className="font-display text-[32px] font-bold">{m.monto != null ? formatPrice(m.monto) : '—'}</p>
          <p className="text-[12px] text-hc-muted">
            {v.etiquetaFecha}: <span className="font-semibold text-hc-warning">{m.fecha ?? FECHA_POR_DEFINIR}</span>
            {m.porcentaje != null && ` · + ${m.porcentaje} % por venta`}{m.minimoComision != null && `, mínimo ${formatPrice(m.minimoComision)}`}
          </p>
        </section>
        <p role={v.caja === 'mal' ? 'alert' : 'status'} className={`rounded-[12px] border px-3.5 py-3 text-[13px] ${CAJA[v.caja]}`}>{textoAviso(m)}</p>
        <div className="sticky bottom-0 mt-auto bg-hc-bg py-3">
          {v.conPago
            ? <Boton onClick={() => void pagar()} disabled={ocupado}>Completar pago</Boton>
            : <Boton variante="contorno" to={ruta('opciones/cobro')}>Ver mis pagos</Boton>}
        </div>
      </>)}
    </div>
  )
}
