import { useEffect, useState } from 'react'
import HojaInferior from '@/components/comprador/HojaInferior'
import { IndicadorPasos, PieCheckoutMovil } from '@/pages/checkout/PiezasCheckout'
import { PROVINCIAS_CR, cantonesDeProvincia } from '@/pages/checkout/ubicacionesCR'
import { formatPrice } from '@/utils/format'
import { CLASE_RADIO_TIENDA } from './PiezasTienda'
import {
  CTA_PASO_TIENDA,
  armarDireccionTienda,
  errorPasoDatosTienda,
  errorPasoEntregaTienda,
  metodosPagoVisibles,
  type MetodoOpcion,
} from './tiendaCheckoutPasos'
import { METODO_ENVIO_DOMICILIO } from './tiendaCheckoutValidacion'

type Linea = Readonly<{ id: number | string; nombre: string; cantidad: number; subtotal: number }>

type Props = Readonly<{
  nombre: string
  correo: string
  telefono: string
  metodoEnvio: string
  metodoPago: string
  notas: string
  envios: readonly MetodoOpcion[]
  pagos: readonly MetodoOpcion[]
  lineas: readonly Linea[]
  total: number
  enviando: boolean
  error: string | null
  onCampo: (campo: 'nombreCliente' | 'correoCliente' | 'telefonoCliente' | 'notas' | 'metodoEnvio' | 'metodoPago' | 'direccionEntrega', valor: string) => void
  onConfirmar: () => void
}>

const CAJA = 'min-h-11 w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] text-[15px] text-hc-n-900 outline-none focus:border-hc-blue-600'

/** Checkout de tienda a 390: Datos, Entrega y Pago, con total y una CTA fijos. */
export default function TiendaCheckoutMovil(props: Props) {
  const [paso, setPaso] = useState(1)
  const [provincia, setProvincia] = useState('')
  const [canton, setCanton] = useState('')
  const [senas, setSenas] = useState('')
  const [hoja, setHoja] = useState<'provincia' | 'canton' | 'resumen' | null>(null)
  const [errorPaso, setErrorPaso] = useState<string | null>(null)
  const [teclado, setTeclado] = useState(0)

  useEffect(() => {
    const vv = globalThis.visualViewport
    if (!vv) return undefined
    const medir = () => setTeclado(Math.max(0, globalThis.innerHeight - vv.height - vv.offsetTop))
    vv.addEventListener('resize', medir)
    return () => vv.removeEventListener('resize', medir)
  }, [])

  function publicarDireccion(p: string, c: string, s: string) {
    props.onCampo('direccionEntrega', armarDireccionTienda(p, c, s))
  }

  function continuar() {
    const fallo = paso === 1
      ? errorPasoDatosTienda(props.nombre, props.correo, props.telefono)
      : paso === 2
        ? errorPasoEntregaTienda(props.metodoEnvio, provincia, canton, senas)
        : null
    if (fallo) {
      setErrorPaso(fallo)
      return
    }
    setErrorPaso(null)
    if (paso < 3) setPaso(paso + 1)
    else props.onConfirmar()
  }

  const pagos = metodosPagoVisibles(props.metodoEnvio, props.pagos)
  const aviso = errorPaso ?? props.error

  return (
    <div className="md:hidden" style={{ paddingBottom: teclado }}>
      <IndicadorPasos paso={paso} onIr={(n) => { if (n < paso) setPaso(n) }} />
      <div className="flex flex-col gap-4 px-4 pb-4">
        <button type="button" onClick={() => setHoja('resumen')} className="min-h-11 text-left text-[13px] font-semibold text-hc-blue-600">
          Ver resumen
        </button>
        {paso === 1 ? (
          <PasoDatos
            nombre={props.nombre}
            correo={props.correo}
            telefono={props.telefono}
            onCampo={props.onCampo}
          />
        ) : null}
        {paso === 2 ? (
          <PasoEntrega
            metodoEnvio={props.metodoEnvio}
            envios={props.envios}
            provincia={provincia}
            canton={canton}
            senas={senas}
            onEnvio={(v) => props.onCampo('metodoEnvio', v)}
            onAbrir={(cual) => setHoja(cual)}
            onSenas={(v) => {
              setSenas(v)
              publicarDireccion(provincia, canton, v)
            }}
          />
        ) : null}
        {paso === 3 ? (
          <PasoPago
            metodoPago={props.metodoPago}
            pagos={pagos}
            notas={props.notas}
            onPago={(v) => props.onCampo('metodoPago', v)}
            onNotas={(v) => props.onCampo('notas', v)}
          />
        ) : null}
        {aviso ? <p role="alert" className="text-[13px] text-hc-danger">{aviso}</p> : null}
      </div>
      <PieCheckoutMovil
        total={props.total}
        etiqueta={props.enviando ? 'Enviando pedido...' : CTA_PASO_TIENDA[paso - 1]}
        onClick={continuar}
        deshabilitado={props.enviando}
      />
      <HojaUbicacion
        abierta={hoja === 'provincia' || hoja === 'canton'}
        titulo={hoja === 'canton' ? 'Cantón' : 'Provincia'}
        opciones={hoja === 'canton' ? cantonesDeProvincia(provincia) : PROVINCIAS_CR}
        onCerrar={() => setHoja(null)}
        onElegir={(valor) => {
          if (hoja === 'provincia') {
            setProvincia(valor)
            setCanton('')
            publicarDireccion(valor, '', senas)
          } else {
            setCanton(valor)
            publicarDireccion(provincia, valor, senas)
          }
          setHoja(null)
        }}
      />
      <HojaInferior
        abierta={hoja === 'resumen'}
        onCerrar={() => setHoja(null)}
        titulo={<h2 className="font-display text-lg font-bold">Resumen</h2>}
      >
        <ul className="flex flex-col gap-2">
          {props.lineas.map((linea) => (
            <li key={linea.id} className="flex justify-between gap-3 text-[13px]">
              <span className="truncate">{linea.nombre} × {linea.cantidad}</span>
              <span className="shrink-0 font-medium">{formatPrice(linea.subtotal)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between font-display text-[17px] font-bold">
          <span>Total</span>
          <span>{formatPrice(props.total)}</span>
        </p>
      </HojaInferior>
    </div>
  )
}

function PasoDatos({
  nombre, correo, telefono, onCampo,
}: Readonly<{
  nombre: string
  correo: string
  telefono: string
  onCampo: Props['onCampo']
}>) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-display text-base font-bold">¿A quién le avisamos del pedido?</legend>
      <label className="text-[13px] font-semibold">Nombre completo
        <input className={CAJA} autoComplete="name" enterKeyHint="next" value={nombre} onChange={(e) => onCampo('nombreCliente', e.target.value)} />
      </label>
      <label className="text-[13px] font-semibold">Correo electrónico
        <input className={CAJA} type="email" inputMode="email" autoComplete="email" enterKeyHint="next" value={correo} onChange={(e) => onCampo('correoCliente', e.target.value)} />
      </label>
      <label className="text-[13px] font-semibold">Teléfono
        <span className="mt-1.5 flex items-center gap-2 rounded-[12px] border border-hc-n-200 px-[14px]">
          <span className="text-[15px] text-hc-n-600">+506</span>
          <input className="min-h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="done" value={telefono} onChange={(e) => onCampo('telefonoCliente', e.target.value)} />
        </span>
      </label>
    </fieldset>
  )
}

function PasoEntrega({
  metodoEnvio, envios, provincia, canton, senas, onEnvio, onAbrir, onSenas,
}: Readonly<{
  metodoEnvio: string
  envios: readonly MetodoOpcion[]
  provincia: string
  canton: string
  senas: string
  onEnvio: (v: string) => void
  onAbrir: (cual: 'provincia' | 'canton') => void
  onSenas: (v: string) => void
}>) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-display text-base font-bold">Entrega</legend>
      <Radios name="envio-movil" opciones={envios} valor={metodoEnvio} onChange={onEnvio} />
      {metodoEnvio === METODO_ENVIO_DOMICILIO ? (
        <>
          <BotonLista etiqueta="Provincia" valor={provincia || 'Elegí provincia'} onClick={() => onAbrir('provincia')} />
          <BotonLista etiqueta="Cantón" valor={canton || 'Elegí cantón'} onClick={() => onAbrir('canton')} deshabilitado={!provincia} />
          <label className="text-[13px] font-semibold">Señas
            <input className={CAJA} autoComplete="street-address" enterKeyHint="done" value={senas} onChange={(e) => onSenas(e.target.value)} />
          </label>
        </>
      ) : null}
    </fieldset>
  )
}

function PasoPago({
  metodoPago, pagos, notas, onPago, onNotas,
}: Readonly<{
  metodoPago: string
  pagos: readonly MetodoOpcion[]
  notas: string
  onPago: (v: string) => void
  onNotas: (v: string) => void
}>) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-display text-base font-bold">Pago</legend>
      <Radios name="pago-movil" opciones={pagos} valor={metodoPago} onChange={onPago} />
      <label className="text-[13px] font-semibold">Notas
        <textarea className={`${CAJA} py-3`} rows={2} value={notas} onChange={(e) => onNotas(e.target.value)} />
      </label>
    </fieldset>
  )
}

function Radios({
  name, opciones, valor, onChange,
}: Readonly<{ name: string; opciones: readonly MetodoOpcion[]; valor: string; onChange: (v: string) => void }>) {
  return (
    <div role="radiogroup" className="overflow-hidden rounded-[12px] border border-hc-n-200">
      {opciones.map((op) => (
        <label key={op.value} className="flex min-h-11 items-center gap-2 border-t border-hc-n-200 px-3 first:border-t-0">
          <input type="radio" name={name} className={CLASE_RADIO_TIENDA} checked={valor === op.value} onChange={() => onChange(op.value)} />
          <span className="text-sm">{op.label}</span>
        </label>
      ))}
    </div>
  )
}

function BotonLista({
  etiqueta, valor, onClick, deshabilitado,
}: Readonly<{ etiqueta: string; valor: string; onClick: () => void; deshabilitado?: boolean }>) {
  return (
    <button type="button" disabled={deshabilitado} onClick={onClick} className="flex min-h-11 w-full items-center justify-between rounded-[12px] border border-hc-n-200 px-3 text-left text-sm disabled:opacity-40">
      <span className="text-hc-n-600">{etiqueta}</span>
      <span className="font-medium">{valor}</span>
    </button>
  )
}

function HojaUbicacion({
  abierta, titulo, opciones, onCerrar, onElegir,
}: Readonly<{
  abierta: boolean
  titulo: string
  opciones: readonly string[]
  onCerrar: () => void
  onElegir: (v: string) => void
}>) {
  const [q, setQ] = useState('')
  const visibles = opciones.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <HojaInferior abierta={abierta} onCerrar={onCerrar} titulo={<h2 className="font-display text-lg font-bold">{titulo}</h2>}>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className={CAJA} />
      <ul>
        {visibles.map((op) => (
          <li key={op}>
            <button type="button" onClick={() => onElegir(op)} className="flex min-h-11 w-full items-center border-b border-hc-n-200 text-left text-sm">
              {op}
            </button>
          </li>
        ))}
      </ul>
    </HojaInferior>
  )
}
