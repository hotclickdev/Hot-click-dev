import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { adminService } from '@/services/orderService'
import { filtrarNegocios, idSeguro, texto } from './normalizar'
import { FichaTienda } from './FichaTienda'
import { Aviso, Carga, Chip, Encabezado, MarcoIcono, Segmento, TARJETA } from './piezas'
import { useCola } from './useCola'

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'suspendidos', label: 'Suspendidos' },
]

export default function NegociosPlataforma() {
  const { id } = useParams()
  if (id && !/^[1-9]\d*$/.test(id)) return <Aviso>Ese negocio no existe.</Aviso>
  return (
    <div className="grid items-start gap-4 md:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
      <ListaNegocios activo={id} />
      <section className="min-w-0 rounded-[16px] border border-hc-n-200 bg-white p-4">
        {id
          ? <FichaTienda id={id} />
          : <Aviso>Elegí una tienda para ver sus productos, pedidos y equipo.</Aviso>}
      </section>
    </div>
  )
}

function ListaNegocios({ activo }: { activo?: string }) {
  const [params] = useSearchParams()
  const [filtro, setFiltro] = useState('todos')
  const consulta = params.get('q') ?? ''
  const { filas, estado, mensaje } = useCola('negocios', () => adminService.getEmpresas())
  const visibles = useMemo(() => filtrarNegocios(filas, filtro, consulta), [filas, filtro, consulta])

  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Tiendas" detalle="Plan, estado y catálogo. La ficha se abre al lado." />
      <Segmento opciones={FILTROS} valor={filtro} onChange={setFiltro} />
      {estado === 'carga' && <Carga />}
      {estado === 'error' && <Aviso>{mensaje}</Aviso>}
      {estado === 'listo' && visibles.length === 0 && <Aviso>Nada en este filtro.</Aviso>}
      <ul className="flex flex-col gap-2">
        {visibles.map((fila) => {
          const negocioId = idSeguro(fila)
          if (!negocioId) return null
          const elegido = negocioId === activo
          return (
            <li key={negocioId}>
              <Link to={`/plataforma/negocios/${negocioId}`} className={`${TARJETA} flex items-center gap-3 border-l-4 ${elegido ? 'border-l-hc-blue-600' : 'border-l-transparent'}`}>
                <MarcoIcono id="negocios" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[17px] font-bold leading-6 text-hc-n-900">{texto(fila.nombreComercial, texto(fila.nombreEmpresa, 'Negocio'))}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <Chip tono="azul">{texto(fila.plan, texto(fila.planSaas, 'Sin plan'))}</Chip>
                    <Chip tono={texto(fila.estadoEmpresa).toUpperCase() === 'ACTIVO' ? 'ok' : 'alerta'}>{texto(fila.estadoEmpresa, '—')}</Chip>
                    <Chip>{fila.visibilidadPublica === true ? 'Catálogo visible' : 'Catálogo oculto'}</Chip>
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
