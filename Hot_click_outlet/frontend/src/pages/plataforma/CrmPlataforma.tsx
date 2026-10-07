import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { consolaService, objetoDe } from './consola'
import { contactosDe, filtrarContactos, mensajePrevio, type Contacto } from './crmVista'
import { campoLista, texto, type Fila } from './normalizar'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, Chip, Segmento, TARJETA } from './piezas'
import { NotaNegocio } from './NotaNegocio'
import { accionNota } from './notaAccion'
import { enlaceWhatsapp } from './whatsapp'

const BANDEJAS = [
  { id: 'porContactar', label: 'Por contactar' },
  { id: 'esperandoStock', label: 'Esperando stock' },
  { id: 'enEntrega', label: 'En entrega' },
  { id: 'reclamo', label: 'Reclamo' },
] as const

const FILTROS = [
  { id: 'genera', label: 'Por lo que generan' },
  { id: 'proceso', label: 'En proceso' },
  { id: 'activos', label: 'Ya inscritos' },
]

export default function CrmPlataforma() {
  const [crm, setCrm] = useState<Fila>({})
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [filtro, setFiltro] = useState('genera')
  const [elegido, setElegido] = useState<string | null>(null)
  const [marca, setMarca] = useState(0)

  useEffect(() => {
    consolaService.crm()
      .then((respuesta) => { setCrm(objetoDe(respuesta.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [marca])

  const contactos = filtrarContactos(contactosDe(campoLista(crm, 'contactos')), filtro)
  const activo = contactos.find((fila) => fila.empresaId === elegido) ?? contactos[0] ?? null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-[28px] font-extrabold leading-8">CRM</h1>
        <p className="mt-1 max-w-2xl text-sm text-hc-n-600">
          Quién está detrás de cada negocio, cuánto genera y quién sigue en proceso de inscripción. El mensaje previo se abre en WhatsApp: HotClick no lo envía solo.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {BANDEJAS.map((bandeja) => (
          <section key={bandeja.id} className={TARJETA}>
            <p className="text-xs font-semibold text-hc-n-600">{bandeja.label}</p>
            <p className="mt-1 font-display text-[28px] font-extrabold leading-8">{cifra(crm[bandeja.id])}</p>
          </section>
        ))}
      </div>
      <Segmento opciones={FILTROS} valor={filtro} onChange={setFiltro} />
      {estado === 'carga' && <Carga />}
      {estado === 'error' && <Aviso>No se pudo cargar el CRM.</Aviso>}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <Lista contactos={contactos} activo={activo?.empresaId ?? null} onElegir={setElegido} />
        <div className="flex flex-col gap-3">
          <NotaNegocio
            empresaId={activo?.empresaId ?? ''}
            negocio={activo?.negocio ?? ''}
            filas={notasDe(campoLista(crm, 'notas'), activo?.empresaId ?? '')}
            onGuardada={() => setMarca((n) => n + 1)}
          />
          <MensajePrevio contacto={activo} onNota={() => setMarca((n) => n + 1)} />
        </div>
      </div>
      <Notas filas={campoLista(crm, 'notas')} contactos={contactosDe(campoLista(crm, 'contactos'))} />
    </div>
  )
}

function Lista({ contactos, activo, onElegir }: {
  contactos: Contacto[]
  activo: string | null
  onElegir: (id: string) => void
}) {
  if (contactos.length === 0) return <Aviso>Nadie en este filtro.</Aviso>
  return (
    <div className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-white">
      <div className="grid grid-cols-[1.1fr_1fr_6.5rem] gap-2 border-b border-hc-n-200 bg-hc-n-50 px-4 py-2 text-xs font-semibold text-hc-n-600">
        <span>Persona</span><span>Negocio</span><span>Genera</span>
      </div>
      <ul>
        {contactos.map((fila) => (
          <li key={fila.empresaId}>
            <button
              type="button"
              onClick={() => onElegir(fila.empresaId)}
              className={`grid w-full grid-cols-[1.1fr_1fr_6.5rem] items-center gap-2 border-t border-hc-n-200 px-4 py-3 text-left ${fila.empresaId === activo ? 'bg-hc-blue-50' : 'bg-white'}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{fila.persona}</span>
                {fila.correo && <span className="block truncate text-xs text-hc-n-600">{fila.correo}</span>}
                <Chip tono={fila.enProceso ? 'alerta' : 'ok'}>{fila.estado}</Chip>
              </span>
              <span className="truncate text-sm">{fila.negocio}</span>
              <span className="whitespace-nowrap font-display text-sm font-bold">{colones(fila.genera)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MensajePrevio({ contacto, onNota }: { contacto: Contacto | null; onNota: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Borrador
        titulo="Mensaje previo"
        detalle="Se abre WhatsApp en su teléfono. Usted lo envía; HotClick no tiene una línea automática."
        persona={contacto?.persona ?? ''}
        negocio={contacto?.negocio ?? ''}
        telefono={contacto?.telefono ?? ''}
        enProceso={contacto?.enProceso ?? true}
        empresaId={contacto?.empresaId}
        onNota={onNota}
      />
      <AlguienNuevo />
    </div>
  )
}

function Borrador({ titulo, detalle, persona, negocio, telefono, enProceso, empresaId, onNota }: {
  titulo: string
  detalle: string
  persona: string
  negocio: string
  telefono: string
  enProceso: boolean
  empresaId?: string
  onNota?: () => void
}) {
  const [mensaje, setMensaje] = useState('')
  const [numero, setNumero] = useState(telefono)
  const [aviso, setAviso] = useState('')
  useEffect(() => {
    setMensaje(negocio ? mensajePrevio(persona, negocio, enProceso) : '')
    setNumero(telefono)
    setAviso('')
  }, [persona, negocio, telefono, enProceso])

  const enlace = enlaceWhatsapp(numero, mensaje)

  async function abrir() {
    if (!enlace) {
      setAviso('Falta un teléfono de Costa Rica, de 8 dígitos.')
      return
    }
    window.open(enlace, '_blank', 'noopener,noreferrer')
    if (!empresaId) return
    try {
      await consolaService.nota(empresaId, `Mensaje previo: ${mensaje}`, 'Esperar respuesta en WhatsApp', 'porContactar')
      onNota?.()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">{titulo}</h2>
      <p className="mt-1 text-sm text-hc-n-600">{detalle}</p>
      {negocio && <p className="mt-3 text-sm font-semibold">{persona} · {negocio}</p>}
      <label className="mt-3 block text-xs font-semibold text-hc-n-600">
        Teléfono
        <input value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="tel" className="mt-1 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm" />
      </label>
      <label className="mt-2 block text-xs font-semibold text-hc-n-600">
        Mensaje
        <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-hc-n-200 px-3 py-2 text-sm" />
      </label>
      {aviso && <p className="mt-2 text-sm text-hc-primary-text">{aviso}</p>}
      <button type="button" className={`${BOTON_PRIMARIO} mt-3`} onClick={() => void abrir()}>Abrir WhatsApp</button>
      {empresaId && (
        <Link className="mt-3 block text-sm font-semibold text-hc-blue-600" to={`/plataforma/negocios/${empresaId}`}>Ver la ficha</Link>
      )}
    </section>
  )
}

function AlguienNuevo() {
  const [persona, setPersona] = useState('')
  const [negocio, setNegocio] = useState('')
  const [telefono, setTelefono] = useState('')
  const [mensaje, setMensaje] = useState('Hola, soy de HotClick. Te escribo antes de que inscribas el negocio, por si te sirve una mano para entrar.')
  const [aviso, setAviso] = useState('')
  const enlace = enlaceWhatsapp(telefono, mensaje)

  function cambiar(campo: 'persona' | 'negocio', valor: string) {
    const siguiente = { persona, negocio, [campo]: valor }
    if (campo === 'persona') setPersona(valor)
    else setNegocio(valor)
    const nombre = siguiente.persona.trim() || 'Sin nombre todavía'
    const tienda = siguiente.negocio.trim() || 'su negocio'
    setMensaje(mensajePrevio(nombre, tienda, true))
  }

  function abrir() {
    if (!enlace) {
      setAviso('Falta un teléfono de Costa Rica, de 8 dígitos.')
      return
    }
    setAviso('')
    window.open(enlace, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">Todavía no está inscrito</h2>
      <p className="mt-1 text-sm text-hc-n-600">Para alguien que aún no tiene ficha. El mensaje sale por WhatsApp, no queda como usuario.</p>
      <Campo etiqueta="Nombre" valor={persona} onChange={(valor) => cambiar('persona', valor)} />
      <Campo etiqueta="Negocio" valor={negocio} onChange={(valor) => cambiar('negocio', valor)} />
      <Campo etiqueta="Teléfono" valor={telefono} onChange={setTelefono} />
      <label className="mt-2 block text-xs font-semibold text-hc-n-600">
        Mensaje
        <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-hc-n-200 px-3 py-2 text-sm" />
      </label>
      {aviso && <p className="mt-2 text-sm text-hc-primary-text">{aviso}</p>}
      <button type="button" className={`${BOTON_SECUNDARIO} mt-3`} onClick={abrir}>Abrir WhatsApp</button>
    </section>
  )
}

function Campo({ etiqueta, valor, onChange }: { etiqueta: string; valor: string; onChange: (valor: string) => void }) {
  return (
    <label className="mt-2 block text-xs font-semibold text-hc-n-600">
      {etiqueta}
      <input value={valor} onChange={(e) => onChange(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm" />
    </label>
  )
}

function Notas({ filas, contactos }: { filas: Fila[]; contactos: Contacto[] }) {
  if (filas.length === 0) return null
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">Notas</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {filas.map((fila) => {
          const id = texto(fila.empresaId)
          const contacto = contactos.find((item) => item.empresaId === id)
          return (
            <li key={texto(fila.id)} className="border-t border-hc-n-200 pt-2 text-sm">
              <Link className="font-semibold text-hc-blue-600" to={`/plataforma/negocios/${id}`}>
                {contacto?.negocio ?? 'Tienda'} · {accionNota(texto(fila.bandeja))?.label ?? 'Nota'}
              </Link>
              <p>{texto(fila.nota)}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function notasDe(filas: Fila[], empresaId: string): Fila[] {
  if (!empresaId) return []
  return filas.filter((fila) => texto(fila.empresaId) === empresaId)
}

function cifra(valor: unknown): string {
  return typeof valor === 'number' && Number.isFinite(valor) ? String(valor) : '—'
}

function colones(valor: number): string {
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(valor)
}
