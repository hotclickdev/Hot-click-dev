import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatPrice } from '@/utils/format'
import { CHIP, contracargosApi, cuentaRegresiva, pruebaValida, textoRetencion, type Contracargo } from './contracargosApi'

const CHIPC = 'inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold'

/** S5-23 · Contracargos (admin): lista y detalle con cuenta regresiva, pruebas privadas y estado final. */
export default function ContracargosPage() {
  const { id } = useParams()
  return id ? <Detalle id={id} /> : <Lista />
}

function Lista() {
  const [lista, setLista] = useState<Contracargo[] | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => { contracargosApi.listar().then(setLista).catch(() => setError(true)) }, [])
  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-3 px-4 py-6">
      <h1 className="font-display text-[22px] font-bold">Contracargos</h1>
      {error && <p role="alert" className="text-[13px] text-hc-primary-text">No se pudieron cargar los contracargos.</p>}
      {lista?.length === 0 && <p className="text-[13px] text-hc-n-600">No hay contracargos.</p>}
      {lista?.map((c) => (
        <Link key={c.id} to={`/plataforma/contracargos/${c.id}`} className="flex items-center justify-between gap-2 rounded-[14px] border border-hc-n-200 bg-white p-4 text-[13px]">
          <span><b>#{c.numero} · {c.tienda}</b><span className="block text-hc-n-600">{c.estado === 'ABIERTO' ? (cuentaRegresiva(c.venceEl) ? `Quedan ${cuentaRegresiva(c.venceEl)}` : 'Plazo vencido') : c.monto != null ? formatPrice(c.monto) : ''}</span></span>
          <span className={`${CHIPC} ${CHIP[c.estado].clase}`}>● {CHIP[c.estado].texto}</span>
        </Link>
      ))}
    </main>
  )
}

function Detalle({ id }: { id: string }) {
  const [c, setC] = useState<Contracargo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())
  const input = useRef<HTMLInputElement>(null)

  const cargar = useCallback(() => { contracargosApi.detalle(id).then(setC).catch(() => setError('No se pudo cargar el contracargo.')) }, [id])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 60_000); return () => clearInterval(t) }, [])

  async function correr(accion: () => Promise<void>, fallo: string) {
    setOcupado(true); setError(null)
    try { await accion(); cargar() } catch { setError(fallo) } finally { setOcupado(false) }
  }

  if (!c) return <main className="p-6 text-[13px]">{error ?? 'Cargando…'}</main>
  const restante = cuentaRegresiva(c.venceEl, ahora)
  const abierto = c.estado === 'ABIERTO'
  const retencion = textoRetencion(c.retencion, formatPrice)
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col gap-3 px-4 py-6">
      <div className="flex items-center justify-between"><h1 className="font-display text-[20px] font-bold">Contracargo</h1><span className={`${CHIPC} ${CHIP[c.estado].clase}`}>● {CHIP[c.estado].texto}</span></div>
      {abierto && (
        <section className="rounded-[14px] border border-hc-warning/50 bg-hc-warning-bg/40 p-4" aria-live="polite">
          <p className="text-[12px] text-hc-n-600">Tiempo para responder a ONVO</p>
          <p className="font-display text-[28px] font-bold text-hc-warning">{restante ?? 'Plazo vencido'}</p>
          {c.venceEl && <p className="text-[12px] text-hc-n-600">Vence el {new Date(c.venceEl).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })} · plazo de 3 días de ONVO</p>}
        </section>
      )}
      {c.estado === 'GANADO' && <p role="status" className="rounded-[12px] bg-hc-success-bg px-3.5 py-3 text-[13px] text-hc-success-text">ONVO resolvió a favor del negocio. Se libera la retención de {retencion}.</p>}
      {c.estado === 'PERDIDO' && <p role="alert" className="rounded-[12px] bg-hc-danger-bg px-3.5 py-3 text-[13px] text-hc-danger">ONVO resolvió a favor del comprador. Se descuenta el monto del pedido.</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
        <dt className="text-hc-n-600">Pedido</dt><dd className="font-semibold">#{c.numero} · {c.tienda}</dd>
        <dt className="text-hc-n-600">Monto</dt><dd className="font-semibold">{c.monto != null ? formatPrice(c.monto) : 'monto a definir por HOT_CLICK'}</dd>
        <dt className="text-hc-n-600">Retención de ONVO</dt><dd className="font-semibold">{retencion} {c.retencion && <span className="text-[11px] font-normal text-hc-n-600">(informada por ONVO)</span>}</dd>
      </dl>
      {(c.estado === 'GANADO' || c.estado === 'PERDIDO') && (
        <p className="text-[12px] text-hc-n-600">{[c.resueltoEl && `Resuelto el ${c.resueltoEl}`, c.respondidoEl && `respuesta enviada el ${c.respondidoEl} con ${c.pruebas.length} ${c.pruebas.length === 1 ? 'prueba' : 'pruebas'}`].filter(Boolean).join(' · ')}</p>
      )}
      {abierto && (
        <section className="flex flex-col gap-2 rounded-[14px] border border-hc-n-200 bg-white p-4 text-[13px]">
          <b>Pruebas</b>
          {c.pruebas.map((p) => (
            <div key={p.id} className="flex min-h-11 items-center justify-between"><span>📎 {p.nombre}</span>
              <button type="button" disabled={ocupado} className="min-h-11 px-2 font-semibold text-hc-blue-600" onClick={() => void correr(() => contracargosApi.quitar(c.id, p.id), 'No se pudo quitar la prueba.')}>Quitar</button></div>
          ))}
          <input ref={input} type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => {
            const f = e.target.files?.[0]; e.target.value = ''
            if (!f) return
            if (!pruebaValida(f)) { setError('Solo PDF o imagen.'); return }
            void correr(() => contracargosApi.adjuntar(c.id, f), 'No se pudo adjuntar la prueba.')
          }} />
          <button type="button" disabled={ocupado} onClick={() => input.current?.click()} className="flex min-h-11 items-center justify-center rounded-xl border border-hc-blue-600 font-semibold text-hc-blue-600">Adjuntar prueba</button>
          <p className="text-[12px] text-hc-n-600">PDF o imagen. Se guardan en almacenamiento privado; solo el admin las abre.</p>
        </section>
      )}
      {error && <p role="alert" className="text-[13px] text-hc-primary-text">{error}</p>}
      {abierto && (
        <button type="button" disabled={ocupado || !restante || c.pruebas.length === 0} onClick={() => void correr(() => contracargosApi.responder(c.id), 'No se pudo enviar la respuesta a ONVO.')}
          className="sticky bottom-3 mt-auto flex min-h-12 items-center justify-center rounded-xl bg-hc-primary text-[15px] font-bold text-white disabled:opacity-60">Enviar respuesta a ONVO</button>
      )}
    </main>
  )
}
