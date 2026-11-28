import { useEffect, useState, type FormEvent } from 'react'
import {
  contadorService,
  datos,
  type BorradorHacienda,
  type Calculadora,
  type ConsultaHacienda,
  type Evento,
  type RespuestaChat,
  type Vendedor,
} from '@/services/contadorService'
import { colones, cuentaRegresiva, tonoConfianza } from './contador'
import { BotonCopiar, EtiquetaVerificar } from './ContadorPiezas'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, Chip, TARJETA, TITULO } from './piezas'

const INPUT = 'h-12 w-full rounded-xl border border-hc-n-200 bg-hc-surface px-3.5 text-[15px] text-hc-n-900 outline-none focus:border-hc-blue-600'

/** Pestaña «Calendario»: solo lo que aplica al régimen activo. Todas las fechas se pueden cambiar en Ajustes. */
export function ContadorCalendario() {
  const [eventos, setEventos] = useState<Evento[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    contadorService.calendario()
      .then((r) => setEventos(datos<{ eventos: Evento[] }>(r).eventos ?? []))
      .catch((err: unknown) => { console.error(err); setError(true) })
  }, [])

  if (error) return <Aviso>No se pudo cargar el calendario.</Aviso>
  if (!eventos) return <Carga />
  if (eventos.length === 0) return <Aviso>No hay vencimientos en los próximos 120 días.</Aviso>
  return (
    <ul className="flex flex-col gap-2">
      {eventos.map((e) => (
        <li key={e.clave} className={`${TARJETA} flex flex-wrap items-center justify-between gap-2`}>
          <div className="min-w-0">
            <p className="font-semibold text-hc-n-900">{e.titulo}</p>
            <p className="text-xs text-hc-n-600">{e.detalle}</p>
            <p className="text-xs text-hc-n-600">{e.fecha}{e.corridoPorFinDeSemana ? ' (corrido por fin de semana)' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <Chip tono={e.diasRestantes <= 3 ? 'alerta' : 'neutro'}>{cuentaRegresiva(e.diasRestantes)}</Chip>
            {e.verificar && <EtiquetaVerificar />}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Pestaña «Calculadora»: IVA con y sin crédito y recargo recomendado frente al actual. */
export function ContadorCalculadora() {
  const [precio, setPrecio] = useState('')
  const [vendedor, setVendedor] = useState<Vendedor>('NO_INSCRITO')
  const [margen, setMargen] = useState('')
  const [r, setR] = useState<Calculadora | null>(null)
  const [error, setError] = useState('')

  async function calcular(e: FormEvent) {
    e.preventDefault()
    setError('')
    const p = Number(precio)
    if (!Number.isInteger(p) || p <= 0) {
      setError('Escribí un precio entero mayor que cero.')
      return
    }
    const m = margen.trim() === '' ? undefined : Number(margen.replace(',', '.'))
    if (m != null && (Number.isNaN(m) || m < 0 || m > 100)) {
      setError('El margen va de 0 a 100.')
      return
    }
    try {
      setR(datos<Calculadora>(await contadorService.calculadora(p, vendedor, m)))
    } catch (err) {
      console.error(err)
      setError('No se pudo calcular. Revisá los valores.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={calcular} className={`${TARJETA} grid gap-3 sm:grid-cols-3`} noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Precio con IVA (₡)</span>
          <input className={INPUT} inputMode="numeric" value={precio} onChange={(ev) => setPrecio(ev.target.value.replace(/\D/g, '').slice(0, 10))} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Tipo de vendedor</span>
          <select className={INPUT} value={vendedor} onChange={(ev) => setVendedor(ev.target.value as Vendedor)}>
            <option value="INSCRITO">Inscrito (da crédito)</option>
            <option value="RTS">Régimen Simplificado</option>
            <option value="NO_INSCRITO">No inscrito</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Margen de HotClick (%)</span>
          <input className={INPUT} inputMode="decimal" value={margen} placeholder="Opcional" onChange={(ev) => setMargen(ev.target.value.replace(/[^\d.,]/g, '').slice(0, 6))} />
        </label>
        <div className="sm:col-span-3"><button type="submit" className={BOTON_PRIMARIO}>Calcular</button></div>
        {error && <p role="alert" className="text-sm text-hc-primary sm:col-span-3">{error}</p>}
      </form>
      {r && (
        <section className={`${TARJETA} flex flex-col gap-2`}>
          <h2 className={TITULO}>Resultado</h2>
          <p className="text-sm">IVA sin crédito: <b>{colones(r.ivaSinCredito)}</b></p>
          <p className="text-sm">IVA con crédito (solo el margen): <b>{colones(r.ivaConCredito)}</b></p>
          <p className="text-sm">IVA que paga HotClick con este vendedor: <b>{colones(r.ivaEfectivo)}</b></p>
          <p className="text-sm">
            Recargo recomendado: <b>{String(r.recargoRecomendadoPct).replace('.', ',')} %</b> · actual: <b>{String(r.recargoActualPct).replace('.', ',')} %</b>
          </p>
          <Chip tono={r.recargoCubre ? 'ok' : 'alerta'}>
            {r.recargoCubre ? 'El recargo actual cubre el IVA' : 'El recargo actual no alcanza para el IVA'}
          </Chip>
          {r.notas.map((n) => <p key={n} className="text-xs text-hc-n-600">{n}</p>)}
        </section>
      )}
    </div>
  )
}

type Mensaje = { pregunta: string; r: RespuestaChat }

/** Pestaña «Pregúntale al contador». La IA solo lee; cada respuesta trae fuente y nivel. */
export function ContadorChat() {
  const [pregunta, setPregunta] = useState('')
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const p = pregunta.trim()
    if (!p || p.length > 600) {
      setError('Escribí una pregunta de hasta 600 caracteres.')
      return
    }
    setEnviando(true)
    setError('')
    try {
      const r = datos<RespuestaChat>(await contadorService.preguntar(p))
      setMensajes((m) => [...m, { pregunta: p, r }])
      setPregunta('')
    } catch (err) {
      console.error(err)
      setError('No se pudo enviar la pregunta.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3" aria-live="polite">
        {mensajes.map((m, i) => (
          <li key={`${i}-${m.pregunta}`} className="flex flex-col gap-2">
            <p className="self-end rounded-xl bg-hc-blue-600 px-3 py-2 text-sm text-white">{m.pregunta}</p>
            <div className={`${TARJETA} flex flex-col gap-2`}>
              <p className="whitespace-pre-line text-sm text-hc-n-900">{m.r.respuesta}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-hc-n-600">
                <Chip tono={tonoConfianza(m.r.confianza)}>{m.r.confianza}</Chip>
                <span>Fuente: {m.r.fuente || 'sin fuente'}</span>
                <span>· Te quedan {m.r.restantesHoy} preguntas hoy</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={enviar} className={`${TARJETA} flex flex-col gap-2`}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Tu pregunta</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-hc-n-200 bg-hc-surface p-3 text-[15px] outline-none focus:border-hc-blue-600"
            maxLength={600}
            value={pregunta}
            onChange={(ev) => setPregunta(ev.target.value)}
            placeholder="Por ejemplo: ¿cuánto IVA cobramos el mes pasado?"
          />
        </label>
        <p className="text-xs text-hc-n-600">La IA solo lee los totales de HotClick y la normativa cargada. No presenta, paga ni envía nada.</p>
        {error && <p role="alert" className="text-sm text-hc-primary">{error}</p>}
        <div><button type="submit" className={BOTON_PRIMARIO} disabled={enviando}>{enviando ? 'Pensando…' : 'Preguntar'}</button></div>
      </form>
    </div>
  )
}

/** Pestaña «Confirmar con Hacienda»: 4 consultas; el botón solo arma el texto para copiar. */
export function ContadorHacienda() {
  const [consultas, setConsultas] = useState<ConsultaHacienda[] | null>(null)
  const [borrador, setBorrador] = useState<BorradorHacienda | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    contadorService.hacienda()
      .then((r) => setConsultas(datos<ConsultaHacienda[]>(r) ?? []))
      .catch((err: unknown) => { console.error(err); setError(true) })
  }, [])

  async function redactar(clave: string) {
    try {
      setBorrador(datos<BorradorHacienda>(await contadorService.borradorHacienda(clave)))
    } catch (err) {
      console.error(err)
    }
  }

  async function marcar(clave: string, confirmada: boolean) {
    try {
      setConsultas(datos<ConsultaHacienda[]>(await contadorService.marcarHacienda(clave, confirmada)))
    } catch (err) {
      console.error(err)
    }
  }

  if (error) return <Aviso>No se pudieron cargar las consultas.</Aviso>
  if (!consultas) return <Carga />
  return (
    <div className="flex flex-col gap-3">
      {consultas.map((c) => (
        <article key={c.clave} className={`${TARJETA} flex flex-col gap-2`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={TITULO}>{c.titulo}</h2>
            <Chip tono={c.estado === 'CONFIRMADA' ? 'ok' : 'neutro'}>{c.estado === 'CONFIRMADA' ? 'Confirmada' : 'Abierta'}</Chip>
          </div>
          <p className="text-sm text-hc-n-600">{c.resumen}</p>
          <p className="text-xs font-semibold text-hc-primary">{c.aviso}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BOTON_SECUNDARIO} onClick={() => redactar(c.clave)}>Redactar borrador</button>
            <button type="button" className={BOTON_SECUNDARIO} onClick={() => marcar(c.clave, c.estado !== 'CONFIRMADA')}>
              {c.estado === 'CONFIRMADA' ? 'Marcar como abierta' : 'Marcar como confirmada'}
            </button>
          </div>
          {borrador?.clave === c.clave && (
            <div className="flex flex-col gap-2 rounded-xl bg-hc-n-50 p-3">
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-sm text-hc-n-900">{borrador.texto}</pre>
              <div><BotonCopiar texto={borrador.texto} etiqueta="Copiar borrador" /></div>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
