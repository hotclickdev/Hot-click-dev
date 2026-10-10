import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { consolaService } from './consola'
import { filasDe, texto, type Fila } from './normalizar'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, Chip, TARJETA } from './piezas'
import { enlaceWhatsapp } from './whatsapp'
import { PLAZOS, enlaceTiendaRapida, etiquetaRapida, mensajeTiendaRapida } from './tiendaRapida'

type Creada = { token: string; empresaId: string; negocio: string; persona: string; telefono: string; dias: number }

export default function TiendaRapidaPanel({ onCerrar }: { onCerrar: () => void }) {
  const [paso, setPaso] = useState(1)
  const [negocio, setNegocio] = useState('')
  const [persona, setPersona] = useState('')
  const [telefono, setTelefono] = useState('')
  const [dias, setDias] = useState<number>(30)
  const [creada, setCreada] = useState<Creada | null>(null)
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [abiertas, setAbiertas] = useState<Fila[]>([])

  useEffect(() => {
    consolaService.rapidas()
      .then((respuesta) => setAbiertas(filasDe(respuesta.data)))
      .catch((err: unknown) => console.error(err))
  }, [creada])

  async function crear() {
    setOcupado(true)
    setAviso('')
    try {
      const respuesta = await consolaService.crearRapida(negocio.trim(), persona.trim(), telefono.trim(), dias)
      const fila = respuesta.data
      if (!fila || typeof fila !== 'object') throw new Error('vacio')
      const datos = fila as Fila
      setCreada({
        token: texto(datos.token),
        empresaId: texto(datos.empresaId),
        negocio: texto(datos.negocio, negocio.trim()),
        persona: texto(datos.persona, persona.trim()),
        telefono: texto(datos.telefono, telefono.trim()),
        dias: Number(datos.dias) || dias,
      })
      setPaso(4)
    } catch (err) {
      console.error(err)
      setAviso(mensajeDe(err, 'No se pudo crear la tienda.'))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-hc-n-600">Tiendas / Rápida</p>
          <h1 className="font-display text-[28px] font-extrabold leading-8">Crear tienda rápida</h1>
        </div>
        <button type="button" className={BOTON_SECUNDARIO} onClick={onCerrar}>Volver</button>
      </div>
      <Barra paso={Math.min(paso, 3)} />
      <div key={paso} className="hc-escalon-palabra" style={{ animationDuration: '380ms' }}>
        {paso === 1 && <PasoNombre negocio={negocio} setNegocio={setNegocio} onSigue={() => setPaso(2)} aviso={aviso} setAviso={setAviso} />}
        {paso === 2 && (
          <PasoPersona
            persona={persona} setPersona={setPersona} telefono={telefono} setTelefono={setTelefono}
            onAtras={() => setPaso(1)} onSigue={() => setPaso(3)} aviso={aviso} setAviso={setAviso}
          />
        )}
        {paso === 3 && (
          <PasoPlazo
            dias={dias} setDias={setDias} negocio={negocio} persona={persona}
            onAtras={() => setPaso(2)} onCrear={() => void crear()} ocupado={ocupado} aviso={aviso}
          />
        )}
        {paso === 4 && creada && <PasoListo creada={creada} />}
      </div>
      {paso < 4 && <Abiertas filas={abiertas} />}
    </div>
  )
}

function Barra({ paso }: { paso: number }) {
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-hc-n-100">
        <div
          className="h-full rounded-full bg-hc-blue-600 transition-all duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${(paso / 3) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-semibold text-hc-n-600">Paso {paso} de 3</p>
    </div>
  )
}

function PasoNombre({ negocio, setNegocio, onSigue, aviso, setAviso }: {
  negocio: string
  setNegocio: (valor: string) => void
  onSigue: () => void
  aviso: string
  setAviso: (valor: string) => void
}) {
  function sigue() {
    if (negocio.trim().length < 2) {
      setAviso('Escribí el nombre del negocio.')
      return
    }
    setAviso('')
    onSigue()
  }
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">¿Cómo se llama la tienda?</h2>
      <p className="mt-1 text-sm text-hc-n-600">Usted carga los productos. La persona solo completa sus datos.</p>
      <Campo etiqueta="Nombre del negocio" valor={negocio} onChange={setNegocio} />
      {aviso && <p className="mt-2 text-sm text-hc-primary-text">{aviso}</p>}
      <button type="button" className={`${BOTON_PRIMARIO} mt-4`} onClick={sigue}>Siguiente</button>
    </section>
  )
}

function PasoPersona({ persona, setPersona, telefono, setTelefono, onAtras, onSigue, aviso, setAviso }: {
  persona: string
  setPersona: (valor: string) => void
  telefono: string
  setTelefono: (valor: string) => void
  onAtras: () => void
  onSigue: () => void
  aviso: string
  setAviso: (valor: string) => void
}) {
  function sigue() {
    if (persona.trim().length < 2) {
      setAviso('Escribí el nombre de la persona.')
      return
    }
    if (telefono.replace(/\D/g, '').replace(/^506/, '').length !== 8) {
      setAviso('El teléfono es de Costa Rica, de 8 dígitos.')
      return
    }
    setAviso('')
    onSigue()
  }
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">¿A quién se la asigna?</h2>
      <p className="mt-1 text-sm text-hc-n-600">A ese número se abre WhatsApp con el enlace.</p>
      <Campo etiqueta="Nombre" valor={persona} onChange={setPersona} />
      <Campo etiqueta="Teléfono" valor={telefono} onChange={setTelefono} />
      {aviso && <p className="mt-2 text-sm text-hc-primary-text">{aviso}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" className={BOTON_SECUNDARIO} onClick={onAtras}>Atrás</button>
        <button type="button" className={BOTON_PRIMARIO} onClick={sigue}>Siguiente</button>
      </div>
    </section>
  )
}

function PasoPlazo({ dias, setDias, negocio, persona, onAtras, onCrear, ocupado, aviso }: {
  dias: number
  setDias: (valor: number) => void
  negocio: string
  persona: string
  onAtras: () => void
  onCrear: () => void
  ocupado: boolean
  aviso: string
}) {
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">¿Cuánto dura?</h2>
      <p className="mt-1 text-sm text-hc-n-600">{persona} usa {negocio} durante el plazo. Después la tienda se apaga.</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {PLAZOS.map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => setDias(opcion)}
            className={`rounded-[14px] border bg-white px-3 py-4 text-left transition-all duration-300 motion-reduce:transition-none ${
              dias === opcion
                ? 'scale-[1.03] border-hc-blue-600 shadow-[0_1px_3px_rgba(20,23,28,.12)]'
                : 'border-hc-n-200'
            }`}
          >
            <span className="block font-display text-[40px] font-extrabold leading-none text-hc-n-900">{opcion}</span>
            <span className="mt-1 block text-sm text-hc-n-600">días</span>
          </button>
        ))}
      </div>
      {aviso && <p className="mt-2 text-sm text-hc-primary-text">{aviso}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" className={BOTON_SECUNDARIO} onClick={onAtras} disabled={ocupado}>Atrás</button>
        <button type="button" className={BOTON_PRIMARIO} onClick={onCrear} disabled={ocupado}>
          {ocupado ? 'Creando…' : 'Crear y preparar WhatsApp'}
        </button>
      </div>
    </section>
  )
}

function PasoListo({ creada }: { creada: Creada }) {
  const { t } = useTranslation()
  const url = enlaceTiendaRapida(creada.token)
  const enlace = enlaceWhatsapp(creada.telefono, mensajeTiendaRapida(creada.persona, creada.negocio, creada.dias, url))
  return (
    <section className={TARJETA}>
      <p className="font-display text-[40px] font-extrabold leading-none text-hc-success-text">Lista</p>
      <h2 className="mt-2 font-display text-[17px] font-bold">{creada.negocio} quedó por {creada.dias} días</h2>
      <p className="mt-1 text-sm text-hc-n-600">El enlace abre los datos de {creada.persona}. Usted puede cargar los productos desde la ficha.</p>
      <p className="mt-1 text-xs text-hc-n-600">{t('negocioRapido.admin.unSoloUso')}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {enlace && (
          <a className={BOTON_PRIMARIO} href={enlace} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>
        )}
        <Link className={BOTON_SECUNDARIO} to={`/plataforma/negocios/${creada.empresaId}`}>Cargar productos</Link>
      </div>
    </section>
  )
}

function Abiertas({ filas }: { filas: Fila[] }) {
  if (filas.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-hc-n-600">Ya abiertas</h2>
      <ul className="flex flex-col gap-2">
        {filas.map((fila) => <FilaAbierta key={texto(fila.id)} fila={fila} />)}
      </ul>
    </section>
  )
}

const TONO_ENLACE: Record<string, 'azul' | 'ok' | 'alerta'> = { VIGENTE: 'azul', USADO: 'ok' }

function FilaAbierta({ fila }: { fila: Fila }) {
  const { t } = useTranslation()
  const id = texto(fila.id)
  const [estadoEnlace, setEstadoEnlace] = useState(texto(fila.estadoEnlace, 'VIGENTE'))
  const [tokenNuevo, setTokenNuevo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState('')
  const url = tokenNuevo ? enlaceTiendaRapida(tokenNuevo) : ''
  const enlace = url
    ? enlaceWhatsapp(texto(fila.telefono), mensajeTiendaRapida(texto(fila.persona), texto(fila.negocio), Number(fila.dias) || 30, url))
    : ''
  const estado = texto(fila.estado)
  const asignable = estadoEnlace !== 'USADO' && estado !== 'VENCIDA'

  async function accion(tipo: 'regenerar' | 'revocar') {
    setOcupado(true)
    setAviso('')
    try {
      const respuesta = tipo === 'regenerar'
        ? await consolaService.regenerarRapida(id)
        : await consolaService.revocarRapida(id)
      const datos = (respuesta.data ?? {}) as Fila
      setEstadoEnlace(texto(datos.estadoEnlace, tipo === 'regenerar' ? 'VIGENTE' : 'REVOCADO'))
      setTokenNuevo(tipo === 'regenerar' ? texto(datos.token) : '')
    } catch (err) {
      console.error(err)
      setAviso(mensajeDe(err, 'No se pudo cambiar el enlace.'))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <li className={`${TARJETA} flex flex-col gap-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span className="block font-semibold">{texto(fila.negocio, 'Tienda')}</span>
          <span className="text-xs text-hc-n-600">{texto(fila.persona)} · {texto(fila.diasRestantes, '0')} días</span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Chip tono={estado === 'VENCIDA' ? 'alerta' : estado === 'LISTA' ? 'ok' : 'azul'}>{etiquetaRapida(estado)}</Chip>
          <Chip tono={TONO_ENLACE[estadoEnlace] ?? 'alerta'}>
            {t(`negocioRapido.admin.estadoEnlace.${estadoEnlace}`, { defaultValue: estadoEnlace })}
          </Chip>
        </span>
      </div>
      {asignable && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button type="button" className="font-semibold text-hc-blue-600 disabled:opacity-60" disabled={ocupado} onClick={() => void accion('regenerar')}>
            {t('negocioRapido.admin.regenerar')}
          </button>
          {estadoEnlace === 'VIGENTE' && (
            <button type="button" className="font-semibold text-hc-n-600 disabled:opacity-60" disabled={ocupado} onClick={() => void accion('revocar')}>
              {t('negocioRapido.admin.revocar')}
            </button>
          )}
          {enlace && (
            <a className="font-semibold text-hc-blue-600" href={enlace} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          )}
          {url && (
            <button type="button" className="font-semibold text-hc-blue-600" onClick={() => void navigator.clipboard?.writeText(url)}>
              {t('negocioRapido.admin.copiar')}
            </button>
          )}
        </div>
      )}
      {url && <p className="text-xs text-hc-n-600">{t('negocioRapido.admin.unSoloUso')}</p>}
      {aviso && <p className="text-sm text-hc-primary-text">{aviso}</p>}
    </li>
  )
}

function Campo({ etiqueta, valor, onChange }: { etiqueta: string; valor: string; onChange: (valor: string) => void }) {
  return (
    <label className="mt-3 block text-xs font-semibold text-hc-n-600">
      {etiqueta}
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm outline-none transition-shadow focus:border-hc-blue-600 focus:ring-2 focus:ring-hc-blue-100"
      />
    </label>
  )
}

function mensajeDe(err: unknown, fallo: string): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return fallo
  const data = (err as { response?: { data?: { message?: unknown } } }).response?.data
  return typeof data?.message === 'string' && data.message.trim() ? data.message : fallo
}
