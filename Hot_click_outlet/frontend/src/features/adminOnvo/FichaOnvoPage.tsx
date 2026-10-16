import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { adminOnvoApi, type NegocioOnvoDetalle } from './adminOnvoApi'
import { CONCILIACION, porcentajeNoCoincide, validarMotivo, validarPorcentaje, vistaEstado } from './adminOnvoHelpers'
import { errorOnvo } from './erroresOnvo'

type Confirmacion = { tipo: 'registrar' } | { tipo: 'comision'; nuevo: number } | { tipo: 'pausar' } | null
const BTN2 = 'flex min-h-11 items-center justify-center rounded-xl border border-hc-blue-600 px-4 text-[14px] font-semibold text-hc-blue-600 disabled:opacity-50'
const BTN1 = 'flex min-h-11 items-center justify-center rounded-xl bg-hc-primary px-4 text-[15px] font-bold text-white disabled:opacity-60'
const CHIP = 'inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold'

/**
 * S2-29 + S3-22 · Ficha del negocio, sección «Cobros ONVO». Confirmación antes de Registrar, cambiar %
 * y Pausar (con motivo); errores de ONVO en lenguaje claro. IBAN solo enmascarado, como llega del backend.
 */
export default function FichaOnvoPage() {
  const { id = '' } = useParams()
  const [n, setN] = useState<NegocioOnvoDetalle | null>(null)
  const [porcentaje, setPorcentaje] = useState('')
  const [conf, setConf] = useState<Confirmacion>(null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<{ titulo: string; texto: string } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const cargar = useCallback(() => {
    adminOnvoApi.detalle(id)
      .then((d) => { setN(d); setPorcentaje(d.porcentajeOnvo != null ? String(d.porcentajeOnvo) : '') })
      .catch((e) => setError(errorOnvo(e)))
  }, [id])
  useEffect(() => { cargar() }, [cargar])

  async function ejecutar(accion: () => Promise<void>, ok: string) {
    setOcupado(true); setError(null); setAviso(null)
    try { await accion(); setAviso(ok); setConf(null); setMotivo(''); cargar() } catch (e) { setError(errorOnvo(e)); setConf(null) } finally { setOcupado(false) }
  }

  if (!n) return <main className="p-6">{error ? <p role="alert" className="text-hc-danger"><b>{error.titulo}.</b> {error.texto}</p> : <p aria-busy="true">Cargando…</p>}</main>
  const e = vistaEstado(n.estado)
  const valid = validarPorcentaje(porcentaje)
  const pausada = n.estado === 'PAUSADA'
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 py-6">
      <h1 className="font-display text-[22px] font-bold">{n.nombre}</h1>
      <section aria-label="Cobros ONVO" className="flex flex-col gap-3 rounded-[12px] border border-hc-border bg-hc-surface p-4">
        <div className="flex items-center justify-between"><h2 className="font-bold">Cobros ONVO</h2><span className={`${CHIP} ${e.clase}`}>{e.etiqueta}</span></div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
          <dt className="text-hc-muted">Cuenta ONVO</dt><dd className="font-mono">{n.cuentaOnvo ?? '—'}</dd>
          <dt className="text-hc-muted">IBAN</dt><dd className="font-mono">{n.ibanEnmascarado ?? '—'}</dd>
          <dt className="text-hc-muted">Frecuencia</dt><dd>{n.frecuencia === 'MENSUAL' ? 'Mensual' : n.frecuencia === 'QUINCENAL' ? 'Quincenal' : '—'}{n.frecuencia ? ' · US$3 por cada pago (la elige el negocio)' : ''}</dd>
          <dt className="text-hc-muted">Conciliación</dt><dd><span className={`${CHIP} ${CONCILIACION[n.conciliacion]?.clase ?? ''}`}>{CONCILIACION[n.conciliacion]?.etiqueta ?? 'Sin datos'}</span></dd>
        </dl>
        {n.frecuenciaPendiente && <p className="text-[12px] text-hc-warning">Cambio a {n.frecuenciaPendiente === 'MENSUAL' ? 'Mensual' : 'Quincenal'} pendiente de aplicar en ONVO.</p>}
        {n.estado === 'SIN_CUENTA' ? (
          <button type="button" className={BTN1} disabled={ocupado} onClick={() => setConf({ tipo: 'registrar' })}>Registrar negocio en ONVO</button>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-[13px] font-semibold">Comisión en ONVO (%)
              <input inputMode="decimal" value={porcentaje} onChange={(ev) => setPorcentaje(ev.target.value)} className="min-h-11 rounded-xl border border-hc-border px-3 font-normal" />
            </label>
            {valid.error && <p className="text-[12px] text-hc-danger">{valid.error}</p>}
            {valid.valor != null && porcentajeNoCoincide(valid.valor, n.porcentajePlan) && <p className="rounded-[8px] bg-hc-warning-bg px-3 py-2 text-[12px] text-hc-warning">El % no coincide con el plan.</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={BTN2} disabled={ocupado || valid.valor == null || valid.valor === n.porcentajeOnvo} onClick={() => valid.valor != null && setConf({ tipo: 'comision', nuevo: valid.valor })}>Guardar</button>
              <button type="button" className={BTN2} disabled={ocupado} onClick={() => ejecutar(() => adminOnvoApi.reenviarEnlace(n.id), 'Enviamos un enlace nuevo al negocio.')}>Reenviar enlace</button>
              {pausada
                ? <button type="button" className={BTN2} disabled={ocupado} onClick={() => ejecutar(() => adminOnvoApi.reanudar(n.id), 'Cobros reanudados.')}>Reanudar cobros</button>
                : <button type="button" className={BTN2} disabled={ocupado} onClick={() => setConf({ tipo: 'pausar' })}>Pausar cobros</button>}
            </div>
          </>
        )}
        {aviso && <p role="status" className="text-[12px] text-hc-success-text">{aviso}</p>}
        {error && <p role="alert" className="rounded-[12px] bg-hc-danger-bg px-3.5 py-3 text-[13px] text-hc-danger"><b>{error.titulo}.</b> {error.texto}</p>}
      </section>

      {conf && (
        <div role="dialog" aria-modal="true" aria-labelledby="conf-titulo" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center">
          <div className="flex w-full max-w-[420px] flex-col gap-3 rounded-t-[16px] bg-hc-surface p-5 md:rounded-[16px]">
            {conf.tipo === 'registrar' && (<>
              <h2 id="conf-titulo" className="font-display text-[18px] font-bold">¿Registrar {n.nombre} en ONVO?</h2>
              <p className="text-[13px]">ONVO le va a mandar {n.correo ? `a ${n.correo} ` : ''}un enlace para completar su formulario. El negocio queda en «Onboarding pendiente».</p>
              <button type="button" className={BTN1} disabled={ocupado} onClick={() => ejecutar(() => adminOnvoApi.registrar(n.id), 'Negocio registrado en ONVO.')}>Sí, registrar</button>
            </>)}
            {conf.tipo === 'comision' && (<>
              <h2 id="conf-titulo" className="font-display text-[18px] font-bold">¿Cambiar la comisión a {conf.nuevo} %?</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-[13px]">
                <dt className="text-hc-muted">Plan</dt><dd>{n.plan}{n.porcentajePlan != null ? ` · ${n.porcentajePlan} %` : ''}</dd>
                <dt className="text-hc-muted">Ahora</dt><dd>{n.porcentajeOnvo != null ? `${n.porcentajeOnvo} %` : '—'}</dd>
                <dt className="text-hc-muted">Nuevo</dt><dd>{conf.nuevo} %</dd>
              </dl>
              <p className="text-[12px] text-hc-muted">Se aplica a las ventas nuevas desde que ONVO confirme el cambio.</p>
              <button type="button" className={BTN1} disabled={ocupado} onClick={() => ejecutar(() => adminOnvoApi.cambiarComision(n.id, conf.nuevo), 'Comisión actualizada.')}>Sí, cambiar a {conf.nuevo} %</button>
            </>)}
            {conf.tipo === 'pausar' && (<>
              <h2 id="conf-titulo" className="font-display text-[18px] font-bold">¿Pausar los cobros de {n.nombre}?</h2>
              <p className="text-[13px]">Mientras esté pausado, sus clientes no pueden pagar en línea. Los pedidos ya pagados no cambian.</p>
              <label className="flex flex-col gap-1 text-[13px] font-semibold">Motivo (lo ve el negocio) <span className="sr-only">obligatorio</span>
                <input value={motivo} onChange={(ev) => setMotivo(ev.target.value)} placeholder="Mínimo 3 caracteres" className="min-h-11 rounded-xl border border-hc-border px-3 font-normal" />
              </label>
              <button type="button" className={BTN1} disabled={ocupado || validarMotivo(motivo) !== null} onClick={() => ejecutar(() => adminOnvoApi.pausar(n.id, motivo.trim()), 'Cobros pausados.')}>Pausar cobros</button>
            </>)}
            <button type="button" className={BTN2} onClick={() => { setConf(null); setMotivo('') }}>Cancelar</button>
          </div>
        </div>
      )}
    </main>
  )
}
