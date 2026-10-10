import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { consolaService, objetoDe } from './consola'
import { texto } from './normalizar'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga } from './piezas'

type Invitacion = {
  negocio: string
  persona: string
  telefono: string
  dias: number
  diasRestantes: number
  estado: string
}

export default function TiendaRapidaPage() {
  const { token = '' } = useParams()
  const [invitacion, setInvitacion] = useState<Invitacion | null>(null)
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [paso, setPaso] = useState(1)
  const [persona, setPersona] = useState('')
  const [cedula, setCedula] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [clave, setClave] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [lista, setLista] = useState(false)
  const [acepta, setAcepta] = useState(false)

  useEffect(() => {
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
      setEstado('error')
      return
    }
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
        }
        setInvitacion(datos)
        setPersona(datos.persona)
        setTelefono(datos.telefono)
        setLista(datos.estado === 'LISTA')
        setEstado('listo')
      })
      .catch((err: unknown) => {
        console.error(err)
        setEstado('error')
      })
  }, [token])

  async function guardar() {
    if (!invitacion) return
    if (cedula.replace(/\D/g, '').length < 9) {
      setAviso('La cédula va con 9 a 12 dígitos.')
      return
    }
    if (!acepta) {
      setAviso('Confirmá que sos la persona dueña o representante legal del negocio.')
      return
    }
    if (!correo.includes('@') || clave.length < 8) {
      setAviso('El correo y una contraseña de 8 caracteres son obligatorios.')
      return
    }
    setOcupado(true)
    setAviso('')
    try {
      await consolaService.completarRapida(token, {
        persona: persona.trim(), cedula: cedula.trim(), correo: correo.trim(), telefono: telefono.trim(), clave,
      })
      setLista(true)
      setPaso(3)
    } catch (err) {
      console.error(err)
      setAviso(mensajeDe(err, 'No se pudieron guardar los datos.'))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <main className="min-h-screen bg-hc-n-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <p className="font-display text-sm font-bold tracking-wide text-hc-blue-600">HOTCLICK</p>
        {estado === 'carga' && <Carga />}
        {estado === 'error' && <Aviso>Ese enlace no está vigente.</Aviso>}
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
            setPersona={setPersona}
            cedula={cedula}
            setCedula={setCedula}
            correo={correo}
            setCorreo={setCorreo}
            telefono={telefono}
            setTelefono={setTelefono}
            clave={clave}
            setClave={setClave}
            acepta={acepta}
            setAcepta={setAcepta}
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
  acepta: boolean
  setAcepta: (valor: boolean) => void
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

function PasoIdentidad({ persona, setPersona, cedula, setCedula, setPaso }: {
  persona: string
  setPersona: (valor: string) => void
  cedula: string
  setCedula: (valor: string) => void
  setPaso: (paso: number) => void
}) {
  return (
    <div>
      <Campo etiqueta="Nombre completo" valor={persona} onChange={setPersona} />
      <Campo etiqueta="Cédula" valor={cedula} onChange={setCedula} />
      <button type="button" className={`${BOTON_PRIMARIO} mt-4 w-full`} onClick={() => setPaso(2)}>Siguiente</button>
    </div>
  )
}

function PasoCuenta({ invitacion, correo, setCorreo, telefono, setTelefono, clave, setClave, acepta, setAcepta, aviso, ocupado, onGuardar, setPaso }: {
  invitacion: Invitacion
  acepta: boolean
  setAcepta: (valor: boolean) => void
  correo: string
  setCorreo: (valor: string) => void
  telefono: string
  setTelefono: (valor: string) => void
  clave: string
  setClave: (valor: string) => void
  aviso: string
  ocupado: boolean
  onGuardar: () => void
  setPaso: (paso: number) => void
}) {
  return (
    <div>
      <Campo etiqueta="Correo" valor={correo} onChange={setCorreo} />
      <Campo etiqueta="Teléfono" valor={telefono} onChange={setTelefono} />
      <Campo etiqueta="Contraseña" valor={clave} onChange={setClave} secreto />
      {/* [REVISIÓN LEGAL] TODO copy Producto: texto de aceptación provisorio. */}
      <label className="mt-4 flex items-start gap-2 text-sm text-hc-n-900">
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-hc-blue-600" />
        <span>Acepto ser la persona dueña o representante legal de {invitacion.negocio} y responder por lo que se venda en su tienda.</span>
      </label>
      {aviso && <p className="mt-2 text-sm text-hc-primary-text">{aviso}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" className={BOTON_SECUNDARIO} onClick={() => setPaso(1)} disabled={ocupado}>Atrás</button>
        <button type="button" className={`${BOTON_PRIMARIO} flex-1`} onClick={onGuardar} disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar mis datos'}
        </button>
      </div>
    </div>
  )
}

function Listo({ negocio }: { negocio: string }) {
  return (
    <section className="hc-escalon-palabra rounded-[16px] border border-hc-n-200 bg-white p-4" style={{ animationDuration: '420ms' }}>
      <p className="font-display text-[40px] font-extrabold leading-none text-hc-success-text">Listo</p>
      <h1 className="mt-2 font-display text-[22px] font-extrabold leading-7">{negocio}</h1>
      <p className="mt-2 text-sm text-hc-n-600">Sus datos quedaron guardados. Siga estos pasos para dejar la tienda lista:</p>
      <ol className="mt-3 flex flex-col gap-2">
        {PASOS_INICIO.map((p, i) => (
          <li key={p.titulo} className="flex gap-3 rounded-xl border border-hc-n-200 p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-hc-blue-50 text-sm font-bold text-hc-blue-600">{i + 1}</span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-hc-n-900">{p.titulo}</span>
              <span className="text-xs text-hc-n-600">{p.texto}</span>
            </span>
          </li>
        ))}
      </ol>
      <a className={`${BOTON_PRIMARIO} mt-4 w-full`} href="/login?redirect=%2Fadmin%2Fbodegas">Entrar y empezar</a>
    </section>
  )
}

/** Recorrido guiado después de aceptar: bodega, luego productos (normal o personalizado). */
const PASOS_INICIO = [
  { titulo: 'Entrar a su panel', texto: 'Con el correo y la contraseña que acaba de crear.' },
  { titulo: 'Revisar su bodega', texto: 'Desde dónde despacha y si permite retiro o pago en efectivo.' },
  { titulo: 'Revisar o crear productos', texto: 'Normales o personalizados. HotClick ya pudo haber cargado algunos.' },
]

function Campo({ etiqueta, valor, onChange, secreto = false }: {
  etiqueta: string
  valor: string
  onChange: (valor: string) => void
  secreto?: boolean
}) {
  return (
    <label className="mt-3 block text-xs font-semibold text-hc-n-600">
      {etiqueta}
      <input
        type={secreto ? 'password' : 'text'}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={secreto ? 'new-password' : 'on'}
        className="mt-1 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm outline-none focus:border-hc-blue-600 focus:ring-2 focus:ring-hc-blue-100"
      />
    </label>
  )
}

function mensajeDe(err: unknown, fallo: string): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return fallo
  const data = (err as { response?: { data?: { message?: unknown } } }).response?.data
  return typeof data?.message === 'string' && data.message.trim() ? data.message : fallo
}
