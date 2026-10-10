import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { consolaService, objetoDe } from './consola'
import { texto } from './normalizar'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga } from './piezas'
import { RUTA_ONBOARDING_RAPIDO, camposDelError, erroresPaso1, motivoEnlace, type ErroresPaso1 } from './tiendaRapida'
import EnlaceNoVigente from './EnlaceNoVigente'

type Invitacion = {
  negocio: string
  persona: string
  telefono: string
  dias: number
  diasRestantes: number
  estado: string
  versionLegal: string
}

export default function TiendaRapidaPage() {
  const { token = '' } = useParams()
  const { t } = useTranslation()
  const [motivo, setMotivo] = useState<'usado' | 'vencido' | 'noVigente'>('noVigente')
  const [acepto, setAcepto] = useState(false)
  const [invitacion, setInvitacion] = useState<Invitacion | null>(null)
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [paso, setPaso] = useState(1)
  const [persona, setPersona] = useState('')
  const [cedula, setCedula] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [clave, setClave] = useState('')
  const [aviso, setAviso] = useState('')
  const [erroresServidor, setErroresServidor] = useState<ErroresPaso1>({})
  const [ocupado, setOcupado] = useState(false)
  const [lista, setLista] = useState(false)

  const tokenValido = /^[A-Za-z0-9_-]{20,64}$/.test(token)

  useEffect(() => {
    if (!tokenValido) return
    consolaService.verRapida(token)
      .then((respuesta) => {
        const fila = objetoDe(respuesta.data)
        const datos: Invitacion = {
          negocio: texto(fila.negocio, 'Tu tienda'),
          persona: texto(fila.persona),
          telefono: texto(fila.telefono),
          dias: Number(fila.dias) || 30,
          diasRestantes: Number(fila.diasRestantes) || 0,
          estado: texto(fila.estado),
          versionLegal: texto(fila.versionLegal),
        }
        setInvitacion(datos)
        setPersona(datos.persona)
        setTelefono(datos.telefono)
        setLista(datos.estado === 'LISTA')
        setEstado('listo')
      })
      .catch((err: unknown) => {
        console.error(err)
        setMotivo(motivoEnlace(err))
        setEstado('error')
      })
  }, [token, tokenValido])

  async function guardar() {
    if (!invitacion) return
    if (Object.keys(erroresPaso1(persona, cedula)).length > 0) {
      setPaso(1)
      return
    }
    if (!correo.includes('@') || clave.length < 8) {
      setAviso('El correo y una contraseña de 8 caracteres son obligatorios.')
      return
    }
    if (!acepto) {
      setAviso(t('negocioRapido.aceptar.falta'))
      return
    }
    setOcupado(true)
    setAviso('')
    try {
      await consolaService.completarRapida(token, {
        persona: persona.trim(), cedula: cedula.trim(), correo: correo.trim(), telefono: telefono.trim(), clave,
        acepto, versionLegal: invitacion.versionLegal,
      })
      setLista(true)
      setPaso(3)
    } catch (err) {
      console.error(err)
      const causa = motivoEnlace(err)
      if (causa !== 'noVigente') {
        setMotivo(causa)
        setEstado('error')
        return
      }
      const campos = camposDelError(err)
      if (campos.persona || campos.cedula) {
        setErroresServidor(campos)
        setPaso(1)
      }
      setAviso(mensajeDe(err, 'No se pudieron guardar los datos.'))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <main className="min-h-screen bg-hc-n-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <p className="font-display text-sm font-bold tracking-wide text-hc-blue-600">HOTCLICK</p>
        {estado === 'carga' && tokenValido && <Carga />}
        {(estado === 'error' || !tokenValido) && <EnlaceNoVigente motivo={tokenValido ? motivo : 'noVigente'} />}
        {estado === 'listo' && invitacion && invitacion.estado === 'VENCIDA' && (
          <Aviso>{`El plazo de ${invitacion.negocio} ya se cumplió.`}</Aviso>
        )}
        {estado === 'listo' && invitacion && invitacion.estado !== 'VENCIDA' && (lista || paso === 3) && (
          <Listo negocio={invitacion.negocio} />
        )}
        {estado === 'listo' && invitacion && invitacion.estado !== 'VENCIDA' && !lista && paso < 3 && (
          <Formulario
            invitacion={invitacion}
            paso={paso}
            setPaso={setPaso}
            persona={persona}
            setPersona={(v) => { setPersona(v); setErroresServidor({}) }}
            cedula={cedula}
            setCedula={(v) => { setCedula(v); setErroresServidor({}) }}
            erroresServidor={erroresServidor}
            correo={correo}
            setCorreo={setCorreo}
            telefono={telefono}
            setTelefono={setTelefono}
            clave={clave}
            setClave={setClave}
            acepto={acepto}
            setAcepto={setAcepto}
            aviso={aviso}
            ocupado={ocupado}
            onGuardar={() => void guardar()}
          />
        )}
      </div>
    </main>
  )
}

function Formulario(props: {
  invitacion: Invitacion
  paso: number
  erroresServidor: ErroresPaso1
  setPaso: (paso: number) => void
  persona: string
  setPersona: (valor: string) => void
  cedula: string
  setCedula: (valor: string) => void
  correo: string
  setCorreo: (valor: string) => void
  telefono: string
  setTelefono: (valor: string) => void
  clave: string
  setClave: (valor: string) => void
  acepto: boolean
  setAcepto: (valor: boolean) => void
  aviso: string
  ocupado: boolean
  onGuardar: () => void
}) {
  const { invitacion, paso } = props
  return (
    <section key={paso} className="hc-escalon-palabra rounded-[16px] border border-hc-n-200 bg-white p-4" style={{ animationDuration: '420ms' }}>
      <div className="h-1.5 overflow-hidden rounded-full bg-hc-n-100">
        <div className="h-full rounded-full bg-hc-primary transition-all duration-500 ease-out motion-reduce:transition-none" style={{ width: paso === 1 ? '50%' : '100%' }} />
      </div>
      <h1 className="mt-4 font-display text-[28px] font-extrabold leading-8">{invitacion.negocio}</h1>
      <p className="mt-1 text-sm text-hc-n-600">
        Quedan {invitacion.diasRestantes} días. HotClick carga los productos; acá solo van sus datos.
      </p>
      {paso === 1 && <PasoIdentidad {...props} />}
      {paso === 2 && <PasoCuenta {...props} />}
    </section>
  )
}

function PasoIdentidad({ persona, setPersona, cedula, setCedula, setPaso, erroresServidor }: Readonly<{
  persona: string
  setPersona: (valor: string) => void
  cedula: string
  setCedula: (valor: string) => void
  setPaso: (paso: number) => void
  erroresServidor: ErroresPaso1
}>) {
  const { t } = useTranslation()
  const [tocado, setTocado] = useState({ persona: false, cedula: false })
  const errores = erroresPaso1(persona, cedula)
  const valido = Object.keys(errores).length === 0
  const errorDe = (campo: keyof ErroresPaso1) => {
    const local = tocado[campo] ? errores[campo] : undefined
    const texto = erroresServidor[campo] ?? local
    return texto ? t(texto, { defaultValue: texto }) : undefined
  }
  return (
    <div>
      <Campo etiqueta="Nombre completo" valor={persona} onChange={setPersona} error={errorDe('persona')}
        onBlur={() => setTocado((x) => ({ ...x, persona: true }))} />
      <Campo etiqueta="Cédula" valor={cedula} onChange={setCedula} error={errorDe('cedula')}
        onBlur={() => setTocado((x) => ({ ...x, cedula: true }))} />
      <button type="button" className={`${BOTON_PRIMARIO} mt-4 w-full`} disabled={!valido} onClick={() => setPaso(2)}>Siguiente</button>
    </div>
  )
}

function PasoCuenta({ correo, setCorreo, telefono, setTelefono, clave, setClave, acepto, setAcepto, aviso, ocupado, onGuardar, setPaso }: Readonly<{
  correo: string
  setCorreo: (valor: string) => void
  telefono: string
  setTelefono: (valor: string) => void
  clave: string
  setClave: (valor: string) => void
  acepto: boolean
  setAcepto: (valor: boolean) => void
  aviso: string
  ocupado: boolean
  onGuardar: () => void
  setPaso: (paso: number) => void
}>) {
  const { t } = useTranslation()
  return (
    <div>
      <Campo etiqueta="Correo" valor={correo} onChange={setCorreo} />
      <Campo etiqueta="Teléfono" valor={telefono} onChange={setTelefono} />
      <Campo etiqueta="Contraseña" valor={clave} onChange={setClave} secreto />
      <fieldset className="mt-4 rounded-[14px] border border-hc-n-200 bg-hc-n-50 p-3">
        <legend className="px-1 font-display text-sm font-bold text-hc-n-900">{t('negocioRapido.aceptar.titulo')}</legend>
        <p className="text-xs leading-5 text-hc-n-600">
          <a href="/acuerdo-vendedores" target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-n-900 underline underline-offset-2">
            {t('negocioRapido.aceptar.legalEnlace')}
          </a>
          {'. '}
          {t('negocioRapido.aceptar.legal')}
        </p>
        <label className="mt-2 flex items-start gap-2 text-sm text-hc-n-900">
          <input
            type="checkbox"
            checked={acepto}
            onChange={(e) => setAcepto(e.target.checked)}
            required
            aria-required="true"
            className="mt-0.5 size-5 shrink-0 accent-hc-blue-600"
          />
          <span>{t('negocioRapido.aceptar.casilla')}</span>
        </label>
      </fieldset>
      {aviso && <p className="mt-2 text-sm text-hc-primary-text">{aviso}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" className={BOTON_SECUNDARIO} onClick={() => setPaso(1)} disabled={ocupado}>Atrás</button>
        <button type="button" className={`${BOTON_PRIMARIO} flex-1`} onClick={onGuardar} disabled={ocupado || !acepto}>
          {ocupado ? 'Guardando…' : 'Guardar mis datos'}
        </button>
      </div>
    </div>
  )
}

function Listo({ negocio }: { negocio: string }) {
  const { t } = useTranslation()
  return (
    <section className="hc-escalon-palabra rounded-[16px] border border-hc-n-200 bg-white p-4" style={{ animationDuration: '420ms' }}>
      <p className="font-display text-[40px] font-extrabold leading-none text-hc-success-text">Listo</p>
      <h1 className="mt-2 font-display text-[22px] font-extrabold leading-7">{negocio}</h1>
      <p className="mt-2 text-sm text-hc-n-600">Sus datos quedaron guardados. HotClick sigue cargando los productos de la tienda.</p>
      <a className={`${BOTON_PRIMARIO} mt-4 w-full`} href={`/login?redirect=${encodeURIComponent(RUTA_ONBOARDING_RAPIDO)}`}>
        {t('negocioRapido.listo.entrar')}
      </a>
    </section>
  )
}

function Campo({ etiqueta, valor, onChange, secreto = false, error, onBlur }: Readonly<{
  etiqueta: string
  valor: string
  onChange: (valor: string) => void
  secreto?: boolean
  error?: string
  onBlur?: () => void
}>) {
  const id = `campo-${etiqueta.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <label className="mt-3 block text-xs font-semibold text-hc-n-600">
      {etiqueta}
      <input
        type={secreto ? 'password' : 'text'}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete={secreto ? 'new-password' : 'on'}
        className={`mt-1 h-12 w-full rounded-xl border px-3 text-sm outline-none focus:border-hc-blue-600 focus:ring-2 focus:ring-hc-blue-100 ${error ? 'border-hc-red-500' : 'border-hc-n-200'}`}
      />
      {error && <span id={`${id}-error`} role="alert" className="mt-1 block text-xs font-normal text-hc-red-600">{error}</span>}
    </label>
  )
}

function mensajeDe(err: unknown, fallo: string): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return fallo
  const data = (err as { response?: { data?: { message?: unknown } } }).response?.data
  return typeof data?.message === 'string' && data.message.trim() ? data.message : fallo
}
