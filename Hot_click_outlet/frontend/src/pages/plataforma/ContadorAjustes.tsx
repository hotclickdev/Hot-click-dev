import { useEffect, useState, type FormEvent } from 'react'
import { contadorService, datos, type Ajustes, type DocumentoNormativa } from '@/services/contadorService'
import { CAMPOS_PARAMETROS, cambios, colones } from './contador'
import { EtiquetaVerificar } from './ContadorPiezas'
import { Aviso, BOTON_PRIMARIO, Carga, TARJETA, TITULO } from './piezas'

const INPUT = 'h-11 w-full rounded-xl border border-hc-n-200 bg-hc-surface px-3 text-sm text-hc-n-900 outline-none focus:border-hc-blue-600'

/** Pestaña «Ajustes»: valores dudosos editables, límites de la IA y corpus de normativa. */
export function ContadorAjustes() {
  const [a, setA] = useState<Ajustes | null>(null)
  const [param, setParam] = useState<Record<string, string>>({})
  const [base, setBase] = useState({ salario: '', tope: '', limite: '' })
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState(false)

  function cargar(nuevo: Ajustes) {
    setA(nuevo)
    setParam({ ...nuevo.parametros })
    setBase({ salario: String(nuevo.salarioBaseCrc), tope: String(nuevo.topeIaMesUsd), limite: String(nuevo.limitePreguntasDia) })
  }

  useEffect(() => {
    contadorService.ajustes()
      .then((r) => cargar(datos<Ajustes>(r)))
      .catch((err: unknown) => { console.error(err); setError(true) })
  }, [])

  async function guardarBase(e: FormEvent) {
    e.preventDefault()
    setMensaje('')
    try {
      cargar(datos<Ajustes>(await contadorService.guardarAjustes({
        salarioBaseCrc: Number(base.salario),
        topeIaMesUsd: Number(base.tope.replace(',', '.')),
        limitePreguntasDia: Number(base.limite),
      })))
      setMensaje('Ajustes guardados.')
    } catch (err) {
      console.error(err)
      setMensaje('No se pudieron guardar. Revisá los rangos.')
    }
  }

  async function guardarParametros(e: FormEvent) {
    e.preventDefault()
    if (!a) return
    const diff = cambios(a.parametros, param)
    if (Object.keys(diff).length === 0) {
      setMensaje('No hay cambios.')
      return
    }
    try {
      cargar(datos<Ajustes>(await contadorService.guardarParametros(diff)))
      setMensaje('Parámetros guardados.')
    } catch (err) {
      console.error(err)
      setMensaje('Algún parámetro no tiene el formato esperado.')
    }
  }

  if (error) return <Aviso>No se pudieron cargar los ajustes.</Aviso>
  if (!a) return <Carga />
  return (
    <div className="flex flex-col gap-4">
      {mensaje && <p role="status" className="text-sm font-semibold text-hc-n-900">{mensaje}</p>}
      <form onSubmit={guardarBase} className={`${TARJETA} flex flex-col gap-3`} noValidate>
        <div className="flex flex-wrap items-center gap-2"><h2 className={TITULO}>Salario base y límites de la IA</h2><EtiquetaVerificar /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold">Salario base (₡)</span>
            <input className={INPUT} inputMode="numeric" value={base.salario} onChange={(ev) => setBase((b) => ({ ...b, salario: ev.target.value.replace(/\D/g, '').slice(0, 7) }))} />
            <span className="text-xs text-hc-n-600">Tope anual del RTS: {colones(a.topeAnualRtsCrc)}</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold">Tope mensual de IA (USD)</span>
            <input className={INPUT} inputMode="decimal" value={base.tope} onChange={(ev) => setBase((b) => ({ ...b, tope: ev.target.value.replace(/[^\d.,]/g, '').slice(0, 8) }))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold">Preguntas por día</span>
            <input className={INPUT} inputMode="numeric" value={base.limite} onChange={(ev) => setBase((b) => ({ ...b, limite: ev.target.value.replace(/\D/g, '').slice(0, 3) }))} />
          </label>
        </div>
        <div><button type="submit" className={BOTON_PRIMARIO}>Guardar</button></div>
      </form>
      <form onSubmit={guardarParametros} className={`${TARJETA} flex flex-col gap-3`} noValidate>
        <div className="flex flex-wrap items-center gap-2"><h2 className={TITULO}>Parámetros fiscales</h2><EtiquetaVerificar /></div>
        <p className="text-xs text-hc-n-600">Ningún valor dudoso está fijo en el sistema. Un factor vacío significa «sin configurar» y no se calcula nada con él.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CAMPOS_PARAMETROS.map((c) => (
            <label key={c.clave} className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold">{c.etiqueta}</span>
              {c.opciones ? (
                <select className={INPUT} value={param[c.clave] ?? ''} onChange={(ev) => setParam((p) => ({ ...p, [c.clave]: ev.target.value }))}>
                  {c.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className={INPUT} maxLength={400} value={param[c.clave] ?? ''} onChange={(ev) => setParam((p) => ({ ...p, [c.clave]: ev.target.value }))} />
              )}
              <span className="text-xs text-hc-n-600">{c.ayuda}</span>
            </label>
          ))}
        </div>
        <div><button type="submit" className={BOTON_PRIMARIO}>Guardar parámetros</button></div>
      </form>
      <Normativa />
    </div>
  )
}

/** Corpus de normativa tributaria que lee la IA. Sin documentos, el contador responde «No sé». */
function Normativa() {
  const [docs, setDocs] = useState<DocumentoNormativa[]>([])
  const [form, setForm] = useState({ titulo: '', fuente: '', texto: '' })
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    contadorService.normativa()
      .then((r) => setDocs(datos<DocumentoNormativa[]>(r) ?? []))
      .catch((err: unknown) => console.error(err))
  }, [])

  async function agregar(e: FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.fuente.trim() || form.texto.trim().length < 20) {
      setMensaje('Completá título, fuente y un texto de al menos 20 caracteres.')
      return
    }
    try {
      await contadorService.agregarNormativa(form)
      setForm({ titulo: '', fuente: '', texto: '' })
      setDocs(datos<DocumentoNormativa[]>(await contadorService.normativa()) ?? [])
      setMensaje('Documento agregado.')
    } catch (err) {
      console.error(err)
      setMensaje('No se pudo agregar el documento.')
    }
  }

  return (
    <form onSubmit={agregar} className={`${TARJETA} flex flex-col gap-3`} noValidate>
      <h2 className={TITULO}>Normativa para la IA</h2>
      {docs.length === 0 ? (
        <p className="text-sm text-hc-n-600">Todavía no hay normativa cargada: el contador responde «No sé» y recomienda consultar a un contador.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {docs.map((d) => <li key={d.id}><b>{d.titulo}</b> · {d.fuente}</li>)}
        </ul>
      )}
      <input className={INPUT} placeholder="Título (por ejemplo: Ley del IVA, artículo 9)" maxLength={200} value={form.titulo} onChange={(ev) => setForm((f) => ({ ...f, titulo: ev.target.value }))} />
      <input className={INPUT} placeholder="Fuente (sitio oficial, número de decreto)" maxLength={300} value={form.fuente} onChange={(ev) => setForm((f) => ({ ...f, fuente: ev.target.value }))} />
      <textarea className="min-h-28 rounded-xl border border-hc-n-200 bg-hc-surface p-3 text-sm outline-none focus:border-hc-blue-600" placeholder="Texto de la norma" maxLength={20000} value={form.texto} onChange={(ev) => setForm((f) => ({ ...f, texto: ev.target.value }))} />
      {mensaje && <p role="status" className="text-sm text-hc-n-900">{mensaje}</p>}
      <div><button type="submit" className={BOTON_PRIMARIO}>Agregar documento</button></div>
    </form>
  )
}
