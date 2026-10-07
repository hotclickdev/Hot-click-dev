import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { recoleccionService } from '@/services/recoleccionService'
import { consolaService } from './consola'
import { servicioService } from '@/services/servicioService'
import { soporteService } from '@/services/soporteService'
import { urlGoogleMaps } from '@/utils/mapaGoogle'
import { filasDe, idSeguro, texto, type Fila } from './normalizar'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, Chip, Encabezado, MarcoIcono, Segmento, TARJETA, TITULO } from './piezas'

export default function OperacionPlataforma() {
  const navigate = useNavigate()
  const atencion = useLocation().pathname.endsWith('/atencion')
  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Campo" detalle="Lo que pasa fuera de la pantalla. Atención son los tickets. Campo es la ruta del mensajero: cada recolección y el efectivo que trae." />
      <Segmento
        opciones={[{ id: 'atencion', label: 'Atención' }, { id: 'campo', label: 'Campo' }]}
        valor={atencion ? 'atencion' : 'campo'}
        onChange={(id) => navigate(id === 'atencion' ? '/plataforma/operacion/atencion' : '/plataforma/operacion/campo')}
      />
      {atencion ? <Atencion /> : <Campo />}
    </div>
  )
}

function Atencion() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [marca, setMarca] = useState(0)
  const [error, setError] = useState('')
  useEffect(() => {
    soporteService.listarAdmin()
      .then((r) => { setFilas(filasDe(r.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [marca])
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar los tickets.</Aviso>
  const abiertos = filas.filter((f) => texto(f.estado).toUpperCase() !== 'RESUELTO')
  if (abiertos.length === 0) return <Aviso>No hay tickets abiertos. Cuando un vendedor o un comprador pide ayuda, el caso aparece acá para asignárselo y resolverlo.</Aviso>
  return (
    <div className="flex flex-col gap-3">
    <CifraSeccion titulo="Tickets abiertos" valor={String(abiertos.length)} />
    <ul className="grid gap-3 lg:grid-cols-2">
      {error && <li className="text-sm text-hc-primary-text lg:col-span-2">{error}</li>}
      {abiertos.map((fila) => {
        const id = idSeguro(fila)
        if (!id) return null
        return (
          <li key={id} className={TARJETA}>
            <div className="flex items-start gap-3">
              <MarcoIcono id="operacion" />
              <div>
                <p className={TITULO}>{texto(fila.titulo, 'Ticket')}</p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  <Chip tono="azul">{texto(fila.empresaNombre, 'Negocio')}</Chip>
                  <Chip tono="alerta">{texto(fila.estado, 'Abierto')}</Chip>
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className={BOTON_SECUNDARIO} onClick={() => void actuar(id, 'asignar', () => setMarca((n) => n + 1), setError)}>Asignarme</button>
              <button type="button" className={BOTON_PRIMARIO} onClick={() => void actuar(id, 'resolver', () => setMarca((n) => n + 1), setError)}>Resolver</button>
            </div>
          </li>
        )
      })}
    </ul>
    </div>
  )
}

async function actuar(id: string, accion: 'asignar' | 'resolver', listo: () => void, fallar: (mensaje: string) => void) {
  try {
    if (accion === 'asignar') await soporteService.asignar(id)
    else await soporteService.resolver(id, 'Resuelto desde la consola')
    fallar('')
    listo()
  } catch (err) {
    console.error(err)
    fallar(accion === 'asignar' ? 'No se pudo asignar el ticket.' : 'No se pudo resolver el ticket.')
  }
}

function Campo() {
  const [servicios, setServicios] = useState<Fila[]>([])
  const [recolecciones, setRecolecciones] = useState<Fila[]>([])
  const [fallos, setFallos] = useState<string[]>([])
  const [listo, setListo] = useState(false)

  useEffect(() => {
    void Promise.allSettled([
      servicioService.listarTodas(),
      recoleccionService.listar(),
    ]).then(([serv, rec]) => {
      const errores: string[] = []
      if (serv.status === 'fulfilled') setServicios(filasDe(serv.value.data))
      else errores.push('servicios')
      if (rec.status === 'fulfilled') setRecolecciones(filasDe(rec.value.data))
      else errores.push('recolecciones')
      setFallos(errores)
      setListo(true)
    })
  }, [])

  if (!listo) return <Carga />
  return (
    <div className="flex flex-col gap-4">
      <section className={TARJETA}>
        <h2 className="font-display text-[17px] font-bold">Qué es Campo</h2>
        <p className="mt-2 text-sm text-hc-n-600">Es la ruta del mensajero. Cada recolección es una parada, con la bodega y la guía. El efectivo que anota se compara con el pedido: si no cuadra, ese día no sale en la quincena hacia el banco.</p>
      </section>
      {fallos.map((nombre) => <Aviso key={nombre}>{`No se pudo cargar ${nombre}.`}</Aviso>)}
      <TablaConteo
        titulo="En campo"
        filas={[
          { nombre: 'Servicios', cuenta: servicios.length },
          { nombre: 'Recolecciones', cuenta: recolecciones.length },
        ]}
      />
      {servicios.length > 0 && <h2 className="font-display text-[17px] font-bold">Servicios</h2>}
      <div className="grid gap-3 sm:grid-cols-2">
      {servicios.map((fila) => (
        <article key={idSeguro(fila) ?? texto(fila.descripcion)} className={`${TARJETA} flex items-start gap-3`}>
          <MarcoIcono id="operacion" />
          <div>
            <p className="font-semibold">{texto(fila.descripcion, 'Servicio')}</p>
            <Chip tono="azul">{texto(fila.estado, 'En curso')}</Chip>
          </div>
        </article>
      ))}
      </div>
      {recolecciones.length > 0 && <h2 className="font-display text-[17px] font-bold">Recolecciones</h2>}
      <div className="grid gap-3 sm:grid-cols-2">
      {recolecciones.map((fila) => (
        <article key={`r-${idSeguro(fila)}`} className={TARJETA}>
          <div className="flex items-start gap-3">
            <MarcoIcono id="operacion" />
            <p className="font-semibold">{texto(fila.direccionRecoleccion, texto(fila.estado, 'Recolección'))}</p>
          </div>
          {texto(fila.bodegaNombre) ? <p className="text-xs text-hc-n-600">Bodega: {texto(fila.bodegaNombre)}</p> : null}
          <p className="text-xs text-hc-n-600">
            {texto(fila.estado, '—')}
            {texto(fila.numeroGuia, texto(fila.guia, '')) ? ` · guía ${texto(fila.numeroGuia, texto(fila.guia))}` : ''}
          </p>
          <EnlaceBodega fila={fila} />
          <EfectivoMensajero id={idSeguro(fila)} anotado={texto(fila.efectivoAnotado)} />
        </article>
      ))}
      </div>
    </div>
  )
}

function CifraSeccion({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="flex items-end justify-between rounded-[16px] bg-hc-blue-50 px-5 py-4">
      <h2 className="font-display text-[17px] font-bold">{titulo}</h2>
      <p className="font-display text-[40px] font-extrabold leading-none text-hc-blue-600">{valor}</p>
    </div>
  )
}

function TablaConteo({ titulo, filas }: { titulo: string; filas: Array<{ nombre: string; cuenta: number }> }) {
  const total = filas.reduce((suma, fila) => suma + fila.cuenta, 0)
  return (
    <div className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-white">
      <div className="flex items-center justify-between border-b border-hc-n-200 bg-hc-n-50 px-4 py-3">
        <h2 className="font-display text-[17px] font-bold">{titulo}</h2>
        <Chip tono={total > 0 ? 'alerta' : 'ok'}>{total > 0 ? `${total} en curso` : 'Al día'}</Chip>
      </div>
      {filas.map((fila) => (
        <div key={fila.nombre} className="grid grid-cols-[1fr_4rem_6rem] items-center gap-2 border-t border-hc-n-200 px-4 py-3">
          <span className="font-semibold">{fila.nombre}</span>
          <span className="font-display text-lg font-extrabold">{fila.cuenta}</span>
          <Chip tono={fila.cuenta > 0 ? 'azul' : 'ok'}>{fila.cuenta > 0 ? 'Ver' : 'Al día'}</Chip>
        </div>
      ))}
    </div>
  )
}

function EfectivoMensajero({ id, anotado }: { id: string | null; anotado: string }) {
  const [monto, setMonto] = useState(anotado)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  if (!id) return null
  const recoleccionId = id
  async function guardar() {
    setError('')
    setAviso('')
    const valor = Number(monto)
    if (!Number.isInteger(valor) || valor < 0) {
      setError('Anotá el efectivo en colones enteros.')
      return
    }
    try {
      await consolaService.efectivo(recoleccionId, valor)
      setAviso('Anotado. Si no cuadra con el pedido, no sale del banco.')
    } catch (err) {
      console.error(err)
      setError('No se pudo anotar el efectivo.')
    }
  }
  return (
    <div className="mt-3">
      <label className="block text-xs font-semibold text-hc-n-600">
        Efectivo del mensajero
        <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="numeric" className="mt-1 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm" />
      </label>
      <button type="button" className={`${BOTON_SECUNDARIO} mt-2 h-10`} onClick={() => void guardar()}>Anotar</button>
      {error && <p className="mt-1 text-sm text-hc-primary-text">{error}</p>}
      {aviso && <p className="mt-1 text-sm">{aviso}</p>}
    </div>
  )
}

function EnlaceBodega({ fila }: { fila: Fila }) {
  const lat = coordenada(fila.latitud)
  const lng = coordenada(fila.longitud)
  if (lat == null || lng == null) return null
  return (
    <a
      href={urlGoogleMaps(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block text-sm font-semibold text-hc-blue-600"
    >
      Ver bodega en Google Maps
    </a>
  )
}

function coordenada(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  if (typeof valor === 'string' && valor.trim()) {
    const n = Number(valor)
    return Number.isFinite(n) ? n : null
  }
  return null
}
