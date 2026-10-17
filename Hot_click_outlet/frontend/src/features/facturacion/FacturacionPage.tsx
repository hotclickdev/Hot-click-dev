import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { formatPrice } from '@/utils/format'
import { mensajeErrorContrato } from '@/utils/erroresContrato'
import {
  chipsConContador, datosTicoFactura, facturacionApi, validarClave, validarConsecutivo,
  type Acuerdo, type DetallePorFacturar, type Emitida, type FacturaNegocio, type PorFacturar,
} from './facturacionApi'

const PESTANAS = [['por-facturar', 'Por facturar'], ['emitidas', 'Emitidas'], ['negocios', 'Facturas de negocios'], ['acuerdos', 'Acuerdos']] as const
type Pestana = typeof PESTANAS[number][0]
const CHIP = 'inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold'
const TONO = { azul: 'bg-hc-blue-50 text-hc-blue-600', ok: 'bg-hc-success-bg text-hc-success-text', aviso: 'bg-hc-warning-bg text-hc-warning', neutro: 'bg-hc-n-100 text-hc-n-600' }
const BTN2 = 'inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-hc-blue-600 px-4 text-[14px] font-semibold text-hc-blue-600 disabled:opacity-50'

function Chips({ chips, valor, onChange }: { chips: { id: string; texto: string; cantidad: number }[]; valor: string; onChange: (v: string) => void }) {
  return (
    <div role="group" aria-label="Filtros" className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button key={c.id} type="button" aria-pressed={valor === c.id} onClick={() => onChange(c.id)}
          className={`min-h-11 rounded-full border px-3.5 text-[13px] font-semibold ${valor === c.id ? 'border-hc-blue-600 bg-hc-blue-600 text-white' : 'border-hc-n-200 bg-white'}`}>{c.texto} · {c.cantidad}</button>
      ))}
    </div>
  )
}

function useCarga<T>(fn: () => Promise<T[]>) {
  const [filas, setFilas] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [marca, setMarca] = useState(0)
  useEffect(() => { let vivo = true; fn().then((f) => { if (vivo) setFilas(f) }).catch((e: unknown) => { if (vivo) setError(mensajeErrorContrato(e) ?? 'No se pudo cargar.') }); return () => { vivo = false } }, [marca]) // eslint-disable-line react-hooks/exhaustive-deps
  return { filas, error, recargar: () => setMarca((m) => m + 1) }
}

/** 501 PENDIENTE_DECISION_DUENO (#202) → «Todavía no disponible…»; otro error → «No se pudo cargar.». */
const Estado = ({ error, vacio }: { error: string | null; vacio: boolean }) => error ? <p role="alert" className="text-[13px] text-hc-primary-text">{error}</p> : vacio ? <p className="text-[13px] text-hc-n-600">Nada en este filtro.</p> : null

/** S5-20 · Admin → Facturación (4 pestañas). Facturación manual en TicoFactura; acá no se emite nada. */
export default function FacturacionPage() {
  const [pestana, setPestana] = useState<Pestana>('por-facturar')
  return (
    <main className="mx-auto flex max-w-[1232px] flex-col gap-4 px-4 pt-6 pb-10">
      <h1 className="font-display text-[22px] font-bold">Facturación</h1>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-hc-n-200">
        {PESTANAS.map(([id, texto]) => (
          <button key={id} role="tab" type="button" aria-selected={pestana === id} onClick={() => setPestana(id)}
            className={`min-h-11 whitespace-nowrap px-3 text-[14px] font-semibold ${pestana === id ? 'border-b-2 border-hc-blue-600 text-hc-blue-600' : 'text-hc-n-600'}`}>{texto}</button>
        ))}
      </div>
      {pestana === 'por-facturar' && <PorFacturarTab />}
      {pestana === 'emitidas' && <EmitidasTab />}
      {pestana === 'negocios' && <NegociosTab />}
      {pestana === 'acuerdos' && <AcuerdosTab />}
    </main>
  )
}

function Tabla({ cabeza, children }: { cabeza: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-hc-n-200 bg-white">
      <table className="w-full min-w-[560px] text-left text-[13px]"><thead className="text-[12px] text-hc-n-600"><tr>{cabeza.map((c) => <th key={c} className="p-3">{c}</th>)}</tr></thead><tbody>{children}</tbody></table>
    </div>
  )
}

function PorFacturarTab() {
  const { filas, error } = useCarga<PorFacturar>(facturacionApi.porFacturar)
  const [filtro, setFiltro] = useState('todos')
  const [abierto, setAbierto] = useState<DetallePorFacturar | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)
  const chips = useMemo(() => chipsConContador(filas ?? [], [
    { id: 'PAGADO', texto: 'Pagado', filtro: (f) => f.estado === 'PAGADO' }, { id: 'ENTREGADO', texto: 'Entregado', filtro: (f) => f.estado === 'ENTREGADO' }, { id: 'mes', texto: 'Este mes', filtro: (f) => f.esteMes },
  ]), [filas])
  const visibles = (filas ?? []).filter((f) => filtro === 'todos' || (filtro === 'mes' ? f.esteMes : f.estado === filtro))
  async function copiar(d: DetallePorFacturar) {
    try { await navigator.clipboard.writeText(datosTicoFactura(d)); setCopiado('Datos copiados.') } catch { setCopiado('No se pudo copiar. Copiá los datos a mano.') }
  }
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-3">
        <Chips chips={chips} valor={filtro} onChange={setFiltro} />
        <Estado error={error} vacio={!!filas && visibles.length === 0} />
        {visibles.length > 0 && <Tabla cabeza={['Pedido', 'Negocio', 'Fecha', 'Total', 'Estado']}>
          {visibles.map((f) => (
            <tr key={f.id} className="cursor-pointer border-t border-hc-n-200 hover:bg-hc-n-50" onClick={() => { setCopiado(null); void facturacionApi.detalle(f.id).then(setAbierto) }}>
              <td className="p-3"><button type="button" className="font-semibold text-hc-blue-600">#{f.numero}</button></td><td className="p-3">{f.negocio}</td><td className="p-3">{f.fecha}</td><td className="p-3">{formatPrice(f.total)}</td>
              <td className="p-3"><span className={`${CHIP} ${f.estado === 'PAGADO' ? TONO.azul : TONO.ok}`}>● {f.estado === 'PAGADO' ? 'Pagado' : 'Entregado'}</span></td>
            </tr>
          ))}
        </Tabla>}
      </div>
      {abierto && (
        <section aria-label={`Pedido ${abierto.numero}`} className="flex flex-col gap-3 rounded-[14px] border border-hc-n-200 bg-white p-4 text-[13px]">
          <div className="flex items-center justify-between"><h2 className="font-display text-[18px] font-bold">Pedido #{abierto.numero}</h2><span className={`${CHIP} ${TONO.aviso}`}>● Por facturar</span></div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1"><dt className="text-hc-n-600">Negocio</dt><dd className="font-semibold">{abierto.negocio}</dd>
            <dt className="text-hc-n-600">Comprador</dt><dd><b>{abierto.comprador.nombre}</b>{abierto.comprador.correo && ` · ${abierto.comprador.correo}`} <span className="text-hc-n-600">(lo dio en la compra)</span></dd></dl>
          <Tabla cabeza={['Producto', 'CABYS', 'Monto']}>
            {abierto.lineas.map((l, i) => <tr key={i} className="border-t border-hc-n-200"><td className="p-3">{l.descripcion}</td><td className="p-3 font-mono">{l.cabys ?? '—'}</td><td className="p-3">{formatPrice(l.monto)}</td></tr>)}
          </Tabla>
          <button type="button" className={BTN2} onClick={() => void copiar(abierto)}>Copiar datos para TicoFactura</button>
          {copiado && <p role="status" className="text-[12px] text-hc-success-text">{copiado}</p>}
          <p className="text-[12px] text-hc-n-600">Copia productos, CABYS, montos y datos del comprador en el orden de TicoFactura. Después se suben el PDF y el XML en «Emitidas».</p>
        </section>
      )}
    </div>
  )
}

function EmitidasTab() {
  const { filas, error, recargar } = useCarga<Emitida>(facturacionApi.emitidas)
  const [filtro, setFiltro] = useState('todos')
  const [form, setForm] = useState({ pedidoId: '', clave: '', consecutivo: '' })
  const [pdf, setPdf] = useState<File | null>(null)
  const [xml, setXml] = useState<File | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const chips = useMemo(() => chipsConContador(filas ?? [], [{ id: 'EMITIDA', texto: 'Emitida', filtro: (f) => f.estado === 'EMITIDA' }, { id: 'NOTA_CREDITO', texto: 'Con nota de crédito', filtro: (f) => f.estado === 'NOTA_CREDITO' }]), [filas])
  const visibles = (filas ?? []).filter((f) => filtro === 'todos' || f.estado === filtro)
  const errClave = form.clave ? validarClave(form.clave) : null
  const errCons = form.consecutivo ? validarConsecutivo(form.consecutivo) : null
  const listo = form.pedidoId.trim() && !validarClave(form.clave) && !validarConsecutivo(form.consecutivo) && pdf && xml
  async function registrar() {
    if (!listo || !pdf || !xml) return
    setOcupado(true); setMsg(null)
    try { await facturacionApi.registrarEmision({ ...form, pdf, xml }); setMsg('Marcada como emitida.'); setForm({ pedidoId: '', clave: '', consecutivo: '' }); setPdf(null); setXml(null); recargar() }
    catch (e: unknown) { setMsg(mensajeErrorContrato(e) ?? 'No se pudo registrar la emisión.') } finally { setOcupado(false) }
  }
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-3">
        <Chips chips={chips} valor={filtro} onChange={setFiltro} />
        <Estado error={error} vacio={!!filas && visibles.length === 0} />
        {visibles.length > 0 && <Tabla cabeza={['Compra', 'Negocio', 'Consecutivo', 'Clave', 'Fecha', 'Estado']}>
          {visibles.map((f) => <tr key={f.id} className="border-t border-hc-n-200"><td className="p-3">#{f.numero}</td><td className="p-3">{f.negocio}</td><td className="p-3 font-mono">{f.consecutivo}</td><td className="p-3 font-mono">{f.clave.slice(0, 5)}…</td><td className="p-3">{f.fecha}</td>
            <td className="p-3"><span className={`${CHIP} ${f.estado === 'EMITIDA' ? TONO.ok : TONO.neutro}`}>● {f.estado === 'EMITIDA' ? 'Emitida' : 'Con nota de crédito'}</span></td></tr>)}
        </Tabla>}
      </div>
      <section aria-label="Registrar emisión" className="flex flex-col gap-2 rounded-[14px] border border-hc-n-200 bg-white p-4 text-[13px]">
        <b>Registrar emisión</b>
        <label className="flex flex-col gap-1 font-semibold">Pedido<input value={form.pedidoId} onChange={(e) => setForm({ ...form, pedidoId: e.target.value })} placeholder="HC-…" className="min-h-11 rounded-xl border border-hc-n-200 px-3 font-normal" /></label>
        <div className="flex gap-2">
          <label className={`${BTN2} flex-1 cursor-pointer`}>{pdf ? pdf.name : 'Subir PDF'}<input type="file" accept="application/pdf" className="sr-only" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></label>
          <label className={`${BTN2} flex-1 cursor-pointer`}>{xml ? xml.name : 'Subir XML'}<input type="file" accept=".xml,application/xml,text/xml" className="sr-only" onChange={(e) => setXml(e.target.files?.[0] ?? null)} /></label>
        </div>
        <label className="flex flex-col gap-1 font-semibold">Clave numérica (50 dígitos)<input inputMode="numeric" value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value.trim() })} className="min-h-11 rounded-xl border border-hc-n-200 px-3 font-mono font-normal" /></label>
        {errClave && <p className="text-[12px] text-hc-primary-text">{errClave}</p>}
        <label className="flex flex-col gap-1 font-semibold">Consecutivo (20 dígitos)<input inputMode="numeric" value={form.consecutivo} onChange={(e) => setForm({ ...form, consecutivo: e.target.value.trim() })} className="min-h-11 rounded-xl border border-hc-n-200 px-3 font-mono font-normal" /></label>
        {errCons && <p className="text-[12px] text-hc-primary-text">{errCons}</p>}
        <button type="button" disabled={!listo || ocupado} onClick={() => void registrar()} className="min-h-12 rounded-xl bg-hc-primary text-[15px] font-bold text-white disabled:opacity-60">Marcar como Emitida</button>
        {msg && <p role="status" className="text-[12px]">{msg}</p>}
        <p className="text-[12px] text-hc-n-600">Si el comprador dio correo, se le envía el comprobante. Archivos privados: solo admin.</p>
      </section>
    </div>
  )
}

const ESTADO_NEG: Record<FacturaNegocio['estado'], { texto: string; tono: keyof typeof TONO }> = {
  PEDIDA: { texto: 'Pedida', tono: 'aviso' }, RECIBIDA: { texto: 'Recibida', tono: 'azul' }, REVISADA: { texto: 'Revisada', tono: 'ok' }, CUBIERTA_ACUERDO: { texto: 'Cubierta por acuerdo', tono: 'neutro' },
}

function NegociosTab() {
  const { filas, error } = useCarga<FacturaNegocio>(facturacionApi.negocios)
  const [filtro, setFiltro] = useState('todos')
  const chips = useMemo(() => chipsConContador(filas ?? [], (Object.keys(ESTADO_NEG) as FacturaNegocio['estado'][]).map((e) => ({ id: e, texto: ESTADO_NEG[e].texto, filtro: (f: FacturaNegocio) => f.estado === e }))), [filas])
  const visibles = (filas ?? []).filter((f) => filtro === 'todos' || f.estado === filtro)
  return (
    <div className="flex flex-col gap-3">
      <Chips chips={chips} valor={filtro} onChange={setFiltro} />
      <Estado error={error} vacio={!!filas && visibles.length === 0} />
      {visibles.length > 0 && <Tabla cabeza={['Compra', 'Negocio', 'Estado', 'Acción']}>
        {visibles.map((f) => <tr key={f.id} className="border-t border-hc-n-200"><td className="p-3">#{f.numero}</td><td className="p-3">{f.negocio}</td>
          <td className="p-3"><span className={`${CHIP} ${TONO[ESTADO_NEG[f.estado].tono]}`}>● {ESTADO_NEG[f.estado].texto}</span></td>
          <td className="p-3">{f.archivoUrl ? <a href={f.archivoUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">Ver</a> : <span className="text-hc-n-600">Esperando al negocio</span>}</td></tr>)}
      </Tabla>}
    </div>
  )
}

function AcuerdosTab() {
  const { filas, error } = useCarga<Acuerdo>(facturacionApi.acuerdos)
  const [filtro, setFiltro] = useState('todos')
  const chips = useMemo(() => chipsConContador(filas ?? [], [{ id: 'si', texto: 'Con acuerdo', filtro: (f) => f.conAcuerdo }, { id: 'no', texto: 'Sin acuerdo', filtro: (f) => !f.conAcuerdo }]), [filas])
  const visibles = (filas ?? []).filter((f) => filtro === 'todos' || (filtro === 'si') === f.conAcuerdo)
  return (
    <div className="flex flex-col gap-3">
      <Chips chips={chips} valor={filtro} onChange={setFiltro} />
      <Estado error={error} vacio={!!filas && visibles.length === 0} />
      {visibles.length > 0 && <Tabla cabeza={['Negocio', 'Acuerdo', 'Fecha', 'Documento']}>
        {visibles.map((f) => <tr key={f.negocioId} className="border-t border-hc-n-200"><td className="p-3">{f.negocio}</td>
          <td className="p-3"><span className={`${CHIP} ${f.conAcuerdo ? TONO.ok : TONO.neutro}`}>● {f.conAcuerdo ? 'Sí' : 'No'}</span></td><td className="p-3">{f.fecha ?? '—'}</td>
          <td className="p-3">{f.documentoUrl ? <a href={f.documentoUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">{f.documento ?? 'Ver'}</a> : '—'}</td></tr>)}
      </Tabla>}
      <p className="text-[12px] text-hc-n-600">Con acuerdo, las compras de ese negocio quedan «Cubierta por acuerdo» en Facturas de negocios.</p>
    </div>
  )
}
