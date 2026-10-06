import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { recoleccionService } from '@/services/recoleccionService'
import { servicioService } from '@/services/servicioService'
import { soporteService } from '@/services/soporteService'
import { urlGoogleMaps } from '@/utils/mapaGoogle'
import { filasDe, idSeguro, texto, type Fila } from './normalizar'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, Segmento, TARJETA } from './piezas'

export default function OperacionPlataforma() {
  const navigate = useNavigate()
  const campo = useLocation().pathname.includes('/campo')
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-[22px] font-bold text-hc-n-900">Operación</h1>
      <Segmento
        opciones={[{ id: 'atencion', label: 'Atención' }, { id: 'campo', label: 'Campo' }]}
        valor={campo ? 'campo' : 'atencion'}
        onChange={(id) => navigate(id === 'campo' ? '/plataforma/operacion/campo' : '/plataforma/operacion/atencion')}
      />
      {campo ? <Campo /> : <Atencion />}
    </div>
  )
}

function Atencion() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [marca, setMarca] = useState(0)
  useEffect(() => {
    soporteService.listarAdmin()
      .then((r) => { setFilas(filasDe(r.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [marca])
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar los tickets.</Aviso>
  const abiertos = filas.filter((f) => texto(f.estado).toUpperCase() !== 'RESUELTO')
  if (abiertos.length === 0) return <Aviso>Nada pendiente.</Aviso>
  return (
    <ul className="flex flex-col gap-3">
      {abiertos.map((fila) => {
        const id = idSeguro(fila)
        if (!id) return null
        return (
          <li key={id} className={TARJETA}>
            <p className="font-display text-[17px] font-bold">{texto(fila.titulo, 'Ticket')}</p>
            <p className="mt-1 text-xs text-hc-n-600">{texto(fila.empresaNombre, '')} · {texto(fila.estado, '')}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className={BOTON_SECUNDARIO} onClick={() => void actuar(id, 'asignar', () => setMarca((n) => n + 1))}>Asignarme</button>
              <button type="button" className={BOTON_PRIMARIO} onClick={() => void actuar(id, 'resolver', () => setMarca((n) => n + 1))}>Resolver</button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

async function actuar(id: string, accion: 'asignar' | 'resolver', listo: () => void) {
  try {
    if (accion === 'asignar') await soporteService.asignar(id)
    else await soporteService.resolver(id, 'Resuelto desde la consola')
    listo()
  } catch (err) {
    console.error(err)
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
      {fallos.map((nombre) => <Aviso key={nombre}>{`No se pudo cargar ${nombre}.`}</Aviso>)}
      <h2 className="text-sm font-semibold text-hc-n-600">Servicios</h2>
      {servicios.length === 0 && <Aviso>Nada pendiente.</Aviso>}
      {servicios.map((fila) => (
        <article key={idSeguro(fila) ?? texto(fila.descripcion)} className={TARJETA}>
          <p className="font-semibold">{texto(fila.descripcion, 'Servicio')}</p>
          <p className="text-xs text-hc-n-600">{texto(fila.estado, '')}</p>
        </article>
      ))}
      <h2 className="text-sm font-semibold text-hc-n-600">Recolecciones</h2>
      {recolecciones.length === 0 && <Aviso>Nada pendiente.</Aviso>}
      {recolecciones.map((fila) => (
        <article key={`r-${idSeguro(fila)}`} className={TARJETA}>
          <p className="font-semibold">{texto(fila.direccionRecoleccion, texto(fila.estado, 'Recolección'))}</p>
          {texto(fila.bodegaNombre) ? <p className="text-xs text-hc-n-600">Bodega: {texto(fila.bodegaNombre)}</p> : null}
          <p className="text-xs text-hc-n-600">{texto(fila.estado, '')}</p>
          <EnlaceBodega fila={fila} />
        </article>
      ))}
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
