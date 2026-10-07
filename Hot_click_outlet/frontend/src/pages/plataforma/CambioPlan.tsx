import { useEffect, useState } from 'react'
import { adminService } from '@/services/orderService'
import { enlaceWhatsapp } from './whatsapp'
import { filasDe, texto, type Fila } from './normalizar'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, TARJETA } from './piezas'
import { enlaceSuscripcion, esPlanTienda, mensajeSuscripcion, nombrePlan } from './planCambio'

const PLANES = ['EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS'] as const

type Via = 'protocolo' | 'convenio'

export function CambioPlan({
  id, planActual, negocio, telefonoEmpresa, ocupado, setOcupado, setError, onCambio,
}: {
  id: string
  planActual: string
  negocio: string
  telefonoEmpresa: string
  ocupado: boolean
  setOcupado: (valor: boolean) => void
  setError: (mensaje: string) => void
  onCambio: () => void
}) {
  const actual = esPlanTienda(planActual) ? planActual : 'EMPRENDEDOR'
  const [elegido, setElegido] = useState(actual)
  const [via, setVia] = useState<Via>('protocolo')
  const [telefono, setTelefono] = useState(telefonoEmpresa)

  useEffect(() => { setElegido(actual) }, [actual])
  useEffect(() => { cargarTelefono(id, telefonoEmpresa, setTelefono) }, [id, telefonoEmpresa])

  const pendiente = elegido !== actual
  const url = enlaceSuscripcion(actual, elegido)
  const whatsapp = enlaceWhatsapp(telefono, mensajeSuscripcion(negocio, elegido, url))

  return (
    <>
      <label className={`${TARJETA} block min-w-0 text-xs font-semibold text-hc-n-600`}>
        Plan
        <select
          value={elegido}
          onChange={(e) => {
            if (esPlanTienda(e.target.value)) setElegido(e.target.value)
          }}
          className="mt-2 h-12 w-full rounded-xl border border-hc-n-200 bg-white px-3 text-sm font-medium text-hc-n-900"
        >
          {PLANES.map((opcion) => <option key={opcion} value={opcion}>{nombrePlan(opcion)}</option>)}
        </select>
        <p className="mt-2 font-normal text-hc-n-600">Hoy está en {nombrePlan(actual)}. Elegí otro y decidí cómo queda.</p>
      </label>
      {pendiente && (
        <Opciones
          via={via}
          setVia={setVia}
          telefono={telefono}
          setTelefono={setTelefono}
          whatsapp={whatsapp}
          ocupado={ocupado}
          onConvenio={() => void aceptarConvenio(id, elegido, setOcupado, setError, onCambio)}
        />
      )}
    </>
  )
}

function Opciones({ via, setVia, telefono, setTelefono, whatsapp, ocupado, onConvenio }: {
  via: Via
  setVia: (via: Via) => void
  telefono: string
  setTelefono: (valor: string) => void
  whatsapp: string | null
  ocupado: boolean
  onConvenio: () => void
}) {
  return (
    <div className="hc-escalon-palabra flex flex-col gap-3 lg:col-span-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <TarjetaVia
          activa={via === 'protocolo'}
          titulo="Por protocolo"
          detalle="Se le manda el enlace. Entra y registra la tarjeta."
          onClick={() => setVia('protocolo')}
        />
        <TarjetaVia
          activa={via === 'convenio'}
          titulo="Por convenio"
          detalle="Se acepta el plan acá, sin el cobro de la tarjeta."
          onClick={() => setVia('convenio')}
        />
      </div>
      {via === 'protocolo'
        ? <Protocolo telefono={telefono} setTelefono={setTelefono} whatsapp={whatsapp} />
        : <Convenio ocupado={ocupado} onConvenio={onConvenio} />}
    </div>
  )
}

function TarjetaVia({ activa, titulo, detalle, onClick }: {
  activa: boolean
  titulo: string
  detalle: string
  onClick: () => void
}) {
  const marca = activa
    ? 'scale-[1.03] border-hc-blue-600 shadow-[0_1px_3px_rgba(20,23,28,.12)]'
    : 'border-hc-n-200'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[14px] border bg-white px-3 py-4 text-left transition-all duration-300 motion-reduce:transition-none ${marca}`}
    >
      <span className="block font-display text-[17px] font-bold text-hc-n-900">{titulo}</span>
      <span className="mt-1 block text-sm font-normal text-hc-n-600">{detalle}</span>
    </button>
  )
}

function Protocolo({ telefono, setTelefono, whatsapp }: {
  telefono: string
  setTelefono: (valor: string) => void
  whatsapp: string | null
}) {
  return (
    <div className={`${TARJETA} hc-escalon-palabra`}>
      <label className="block text-xs font-semibold text-hc-n-600">
        Teléfono para WhatsApp
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="mt-1 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm outline-none focus:border-hc-blue-600 focus:ring-2 focus:ring-hc-blue-100"
        />
      </label>
      <p className="mt-2 text-sm text-hc-n-600">WhatsApp se abre en su teléfono con el enlace. El plan cambia cuando la persona termina.</p>
      {whatsapp
        ? <a className={`${BOTON_PRIMARIO} mt-3`} href={whatsapp} target="_blank" rel="noopener noreferrer">Mandar el enlace</a>
        : <p className="mt-2 text-sm text-hc-primary-text">El teléfono es de Costa Rica, de 8 dígitos.</p>}
    </div>
  )
}

function Convenio({ ocupado, onConvenio }: { ocupado: boolean; onConvenio: () => void }) {
  return (
    <div className={`${TARJETA} hc-escalon-palabra`}>
      <p className="text-sm text-hc-n-600">El plan queda activo en la ficha. No se le pide la tarjeta.</p>
      <button type="button" className={`${BOTON_SECUNDARIO} mt-3`} disabled={ocupado} onClick={onConvenio}>
        {ocupado ? 'Aceptando…' : 'Aceptar por convenio'}
      </button>
    </div>
  )
}

function cargarTelefono(id: string, telefonoEmpresa: string, setTelefono: (valor: string) => void) {
  if (digitos(telefonoEmpresa).length >= 8) {
    setTelefono(telefonoEmpresa)
    return
  }
  adminService.getEmpresaTab(id, 'equipo')
    .then((respuesta) => setTelefono(telefonoDueno(filasDe(respuesta.data), telefonoEmpresa)))
    .catch((err: unknown) => { console.error(err) })
}

function telefonoDueno(filas: Fila[], respaldo: string): string {
  const dueno = filas.find((fila) => texto(fila.rol).toUpperCase() === 'PROPIETARIO')
  return texto(dueno?.telefono, respaldo)
}

function digitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

async function aceptarConvenio(
  id: string,
  plan: string,
  setOcupado: (valor: boolean) => void,
  setError: (mensaje: string) => void,
  onCambio: () => void,
) {
  setOcupado(true)
  setError('')
  try {
    await adminService.setEmpresaPlan(id, plan)
    onCambio()
  } catch (err) {
    console.error(err)
    setError('No se pudo aceptar el plan por convenio.')
  } finally {
    setOcupado(false)
  }
}
