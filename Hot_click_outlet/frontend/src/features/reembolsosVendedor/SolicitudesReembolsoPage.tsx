import { useCallback, useEffect, useRef, useState } from 'react'
import { formatPrice } from '@/utils/format'
import { EncabezadoPagina } from '@/prototipo/compartido/ui'
import { chipDe, solicitudesApi, textoAlerta, validarMotivoRechazo, type SolicitudReembolso } from './solicitudesApi'

type Conf = { tipo: 'aprobar' | 'rechazar'; s: SolicitudReembolso } | null
const BTN2 = 'flex min-h-11 flex-1 items-center justify-center rounded-xl border border-hc-blue-600 text-[14px] font-semibold text-hc-blue-600 disabled:opacity-50'

/** S5-22 · Reembolsos del vendedor: pendientes con alerta, aprobar/rechazar con confirmación, historial. */
export default function SolicitudesReembolsoPage() {
  const [vista, setVista] = useState<'pendientes' | 'historial'>('pendientes')
  const [lista, setLista] = useState<SolicitudReembolso[] | null>(null)
  const [pendientes, setPendientes] = useState(0)
  const [conf, setConf] = useState<Conf>(null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const cancelar = useRef<HTMLButtonElement>(null)

  const cargar = useCallback(() => {
    solicitudesApi.listar(vista).then((l) => { setLista(l); if (vista === 'pendientes') setPendientes(l.length) }).catch(() => setError('No pudimos cargar las solicitudes.'))
  }, [vista])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { if (conf) cancelar.current?.focus() }, [conf])

  async function confirmar() {
    if (!conf) return
    if (conf.tipo === 'rechazar' && validarMotivoRechazo(motivo)) return
    setOcupado(true); setError(null)
    try {
      if (conf.tipo === 'aprobar') await solicitudesApi.aprobar(conf.s.id); else await solicitudesApi.rechazar(conf.s.id, motivo.trim())
      setConf(null); setMotivo(''); cargar()
    } catch { setError('No pudimos guardar tu respuesta. Probá de nuevo.'); setConf(null) } finally { setOcupado(false) }
  }

  const alerta = vista === 'pendientes' && lista ? textoAlerta(lista.filter((s) => s.vencePronto).length) : null
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-3 px-4 pb-8">
      <EncabezadoPagina titulo="Reembolsos" />
      <div role="tablist" className="flex gap-2">
        {(['pendientes', 'historial'] as const).map((v) => (
          <button key={v} role="tab" aria-selected={vista === v} type="button" onClick={() => setVista(v)}
            className={`min-h-11 rounded-full border px-4 text-[13px] font-semibold ${vista === v ? 'border-hc-blue-600 bg-hc-blue-600 text-white' : 'border-hc-border bg-hc-surface'}`}>
            {v === 'pendientes' ? `Pendientes · ${pendientes}` : 'Historial'}
          </button>
        ))}
      </div>
      {alerta && <p role="alert" className="rounded-[12px] border border-hc-warning/30 bg-hc-warning-bg px-3.5 py-3 text-[13px] text-hc-warning">{alerta}</p>}
      {error && <p role="alert" className="text-[13px] text-hc-danger">{error}</p>}
      {lista?.length === 0 && <p className="text-[13px] text-hc-muted">{vista === 'pendientes' ? 'No tenés solicitudes pendientes.' : 'Todavía no hay historial.'}</p>}
      {lista?.map((s) => {
        const chip = chipDe(s)
        return (
          <article key={s.id} className={`flex flex-col gap-2 rounded-[14px] border bg-hc-surface p-4 ${s.vencePronto && vista === 'pendientes' ? 'border-hc-warning' : 'border-hc-border'}`}>
            <div className="flex items-start justify-between gap-2"><b className="text-[14px]">#{s.numero} · {formatPrice(s.monto)}</b><span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${chip.clase}`}>● {chip.texto}</span></div>
            <p className="text-[12px] text-hc-muted">{[s.comprador, s.producto, s.motivo && `motivo: ${s.motivo}`, s.detalle].filter(Boolean).join(' · ')}</p>
            {vista === 'pendientes' && (
              <div className="flex gap-2">
                <button type="button" className={BTN2} onClick={() => setConf({ tipo: 'rechazar', s })}>Rechazar…</button>
                <button type="button" className={BTN2} onClick={() => setConf({ tipo: 'aprobar', s })}>Aprobar</button>
              </div>
            )}
          </article>
        )
      })}
      {conf && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onKeyDown={(e) => { if (e.key === 'Escape') setConf(null) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="conf-reembolso" className="flex w-full max-w-[440px] flex-col gap-3 rounded-t-[16px] bg-hc-surface p-5 md:rounded-[16px]">
            {conf.tipo === 'aprobar' ? (<>
              <h2 id="conf-reembolso" className="font-display text-[18px] font-bold">¿Aprobar el reembolso de {formatPrice(conf.s.monto)}?</h2>
              <p className="text-[13px]">Le devolvemos a {conf.s.comprador || 'tu cliente'} por ONVO al mismo medio de pago y le avisamos por correo. No se puede deshacer.</p>
            </>) : (<>
              <h2 id="conf-reembolso" className="font-display text-[18px] font-bold">¿Rechazar el reembolso de {formatPrice(conf.s.monto)}?</h2>
              <label className="flex flex-col gap-1 text-[13px] font-semibold">Motivo (lo ve el comprador)
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Mínimo 3 caracteres" className="min-h-11 rounded-xl border border-hc-border px-3 font-normal" />
              </label>
            </>)}
            <button type="button" disabled={ocupado || (conf.tipo === 'rechazar' && !!validarMotivoRechazo(motivo))} onClick={() => void confirmar()} className="flex min-h-12 items-center justify-center rounded-xl bg-hc-primary text-[15px] font-bold text-white disabled:opacity-60">{conf.tipo === 'aprobar' ? 'Sí, aprobar' : 'Sí, rechazar'}</button>
            <button ref={cancelar} type="button" onClick={() => { setConf(null); setMotivo('') }} className="flex min-h-12 items-center justify-center rounded-xl border border-hc-blue-600 font-semibold text-hc-blue-600">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
