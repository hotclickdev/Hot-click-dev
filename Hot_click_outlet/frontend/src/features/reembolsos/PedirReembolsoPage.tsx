import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatPrice } from '@/utils/format'
import MainLayout from '@/layouts/MainLayout'
import { MOTIVOS, etiquetaPaso, reembolsoApi, textoActualizado, totalSeleccion, validarSolicitud, type DatosReembolso, type Motivo } from './reembolsoApi'

/** S5-21 · Pedir reembolso y ver su estado (láminas reembolso-390/1440). */
function ContenidoReembolso() {
  const { id = '' } = useParams()
  const [datos, setDatos] = useState<DatosReembolso | null>(null)
  const [ids, setIds] = useState<string[]>([])
  const [motivo, setMotivo] = useState<Motivo | null>(null)
  const [errores, setErrores] = useState<{ items?: string; motivo?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(() => {
    reembolsoApi.obtener(id).then(setDatos).catch(() => setError('No pudimos cargar tu pedido. Probá de nuevo en unos minutos.'))
  }, [id])
  useEffect(() => { cargar() }, [cargar])

  async function enviar() {
    const e = validarSolicitud(ids, motivo)
    setErrores(e)
    if (e.items || e.motivo || !motivo) return
    setEnviando(true); setError(null)
    try { await reembolsoApi.pedir(id, { itemIds: ids, motivo }); cargar() }
    catch { setError('No pudimos enviar la solicitud. Probá de nuevo.') }
    finally { setEnviando(false) }
  }

  if (!datos) return <main className="mx-auto max-w-[560px] p-6 text-[14px]">{error ? <p role="alert">{error}</p> : <p aria-busy="true">Cargando…</p>}</main>
  const volver = `/mis-pedidos/${encodeURIComponent(id)}`
  const s = datos.solicitud

  if (s) {
    const actual = [...s.pasos].reverse().find((p) => p.fecha)?.clave
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col gap-3 px-4 py-6">
        <div className="flex items-center justify-between"><h1 className="font-display text-[22px] font-bold">Reembolso</h1>
          <span className="rounded-full bg-hc-blue-50 px-2.5 py-0.5 text-[12px] font-semibold text-hc-blue-600">● {actual === 'ACREDITADO' ? 'Acreditado' : 'En proceso'}</span></div>
        <section className="rounded-[16px] border border-hc-border bg-hc-surface p-4 text-[13px]">
          <p className="text-hc-muted">Monto</p>
          <p className="font-display text-[30px] font-bold">{formatPrice(s.monto)}</p>
          <p>Fecha estimada de acreditación: <b>{s.fechaEstimada ?? 'la informa ONVO'}</b></p>
          {s.fechaEstimada && <p className="text-[12px] text-hc-muted">(la informa ONVO)</p>}
          {textoActualizado(s.actualizadoEl) && <p className="mt-1 text-[12px] text-hc-muted">{textoActualizado(s.actualizadoEl)}</p>}
        </section>
        <ol aria-label="Estado del reembolso" className="flex flex-col gap-3 rounded-[16px] border border-hc-border bg-hc-surface p-4 text-[13px]">
          {s.pasos.map((p) => (
            <li key={p.clave} className="flex gap-3">
              <span aria-hidden="true" className={`mt-0.5 size-4 shrink-0 rounded-full border-2 ${p.fecha ? 'border-hc-blue-600 bg-hc-blue-600' : 'border-hc-n-200'}`} />
              <span><b className={p.clave === 'EN_PROCESO' && actual === 'EN_PROCESO' ? 'text-hc-blue-600' : ''}>{etiquetaPaso(p.clave, datos.tienda)}</b>
                {p.fecha && <span className="block text-[12px] text-hc-muted">{p.fecha}</span>}
                {p.clave === 'EN_PROCESO' && actual === 'EN_PROCESO' && <span className="block text-[12px] text-hc-muted">Tu banco puede tardar en mostrarlo</span>}</span>
            </li>
          ))}
        </ol>
        <Link to={volver} className="mt-auto flex min-h-12 items-center justify-center rounded-xl border border-hc-blue-600 font-semibold text-hc-blue-600">Ver mi pedido</Link>
      </main>
    )
  }

  if (!datos.elegible) {
    return <main className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 py-6"><h1 className="font-display text-[22px] font-bold">Pedir reembolso</h1>
      <p className="rounded-[12px] bg-hc-n-100 px-3.5 py-3 text-[13px]">Este pedido ya no se puede reembolsar: el plazo es de 30 días después de la compra.</p>
      <Link to={volver} className="flex min-h-12 items-center justify-center rounded-xl border border-hc-blue-600 font-semibold text-hc-blue-600">Ver mi pedido</Link></main>
  }

  const total = totalSeleccion(datos.items, ids)
  return (
    <main className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 py-6">
      <h1 className="font-display text-[22px] font-bold">Pedir reembolso</h1>
      <p className="text-[12px] text-hc-muted">Pedido #{datos.numero} · {datos.tienda} · podés pedirlo hasta 30 días después de la compra{datos.fechaLimite ? ` (hasta el ${datos.fechaLimite})` : ''}.</p>
      <fieldset className="flex flex-col gap-2" aria-invalid={!!errores.items}>
        <legend className="mb-1 text-[13px] font-bold">¿Qué querés devolver?</legend>
        {datos.items.map((i) => {
          const on = ids.includes(i.id)
          return (
            <label key={i.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[12px] border px-3.5 ${on ? 'border-2 border-hc-blue-600 bg-hc-blue-50' : 'border-hc-border bg-hc-surface'}`}>
              <input type="checkbox" checked={on} onChange={() => setIds((x) => on ? x.filter((y) => y !== i.id) : [...x, i.id])} className="size-5 accent-hc-blue-600" />
              <span className="flex-1 text-[13px]">{i.nombre}</span><b className="text-[13px]">{formatPrice(i.monto)}</b>
            </label>
          )
        })}
        {errores.items && <p role="alert" className="text-[12px] text-hc-danger">{errores.items}</p>}
      </fieldset>
      <fieldset className={`flex flex-col gap-2 rounded-[12px] ${errores.motivo ? 'border border-hc-danger p-1' : ''}`} aria-invalid={!!errores.motivo}>
        <legend className="mb-1 text-[13px] font-bold">Motivo <span className="text-hc-danger">*</span></legend>
        {MOTIVOS.map((m) => (
          <label key={m.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[12px] border border-hc-border bg-hc-surface px-3.5 text-[13px]">
            <input type="radio" name="motivo" checked={motivo === m.id} onChange={() => setMotivo(m.id)} className="size-5 accent-hc-blue-600" />{m.texto}
          </label>
        ))}
        {errores.motivo && <p role="alert" className="text-[12px] text-hc-danger">{errores.motivo}</p>}
      </fieldset>
      {error && <p role="alert" className="text-[13px] text-hc-danger">{error}</p>}
      <div className="sticky bottom-0 flex flex-col gap-2 bg-hc-bg py-3">
        <div className="flex justify-between text-[13px]"><span>A reembolsar</span><b className="text-[16px]">{formatPrice(total)}</b></div>
        <button type="button" disabled={enviando} onClick={() => void enviar()} className="flex min-h-12 items-center justify-center rounded-xl bg-hc-primary text-[15px] font-bold text-white disabled:opacity-60">Enviar solicitud</button>
      </div>
    </main>
  )
}

export default function PedirReembolsoPage() {
  return <MainLayout variante="propia" barraInferior={false}><ContenidoReembolso /></MainLayout>
}
