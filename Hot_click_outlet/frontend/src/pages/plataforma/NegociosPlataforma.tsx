import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { adminService } from '@/services/orderService'
import { filtrarNegocios, idSeguro, texto, type Fila } from './normalizar'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, Segmento, TARJETA, TITULO } from './piezas'
import { useCola } from './useCola'

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'suspendidos', label: 'Suspendidos' },
]

export default function NegociosPlataforma() {
  const { id } = useParams()
  if (id && !/^[1-9]\d*$/.test(id)) return <Aviso>Ese negocio no existe.</Aviso>
  if (id) return <FichaNegocio id={id} />
  return <ListaNegocios />
}

function ListaNegocios() {
  const [params] = useSearchParams()
  const [filtro, setFiltro] = useState('todos')
  const consulta = params.get('q') ?? ''
  const { filas, estado, mensaje } = useCola('negocios', () => adminService.getEmpresas())
  const visibles = useMemo(() => filtrarNegocios(filas, filtro, consulta), [filas, filtro, consulta])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-[22px] font-bold text-hc-n-900">Negocios</h1>
      <Segmento opciones={FILTROS} valor={filtro} onChange={setFiltro} />
      {estado === 'carga' && <Carga />}
      {estado === 'error' && <Aviso>{mensaje}</Aviso>}
      {estado === 'listo' && visibles.length === 0 && <Aviso>Nada en este filtro.</Aviso>}
      <ul className="flex flex-col gap-3">
        {visibles.map((fila) => {
          const negocioId = idSeguro(fila)
          if (!negocioId) return null
          return (
            <li key={negocioId}>
              <Link to={`/plataforma/negocios/${negocioId}`} className={`${TARJETA} block`}>
                <span className={TITULO}>{texto(fila.nombreComercial, texto(fila.nombreEmpresa, 'Negocio'))}</span>
                <span className="mt-1 block text-xs text-hc-n-600">{texto(fila.plan, texto(fila.planSaas, 'Sin plan'))} · {texto(fila.estadoEmpresa, '—')}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FichaNegocio({ id }: { id: string }) {
  const [fila, setFila] = useState<Fila | null>(null)
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [mensaje, setMensaje] = useState('')

  function cargar() {
    setEstado('carga')
    adminService.getEmpresa(id)
      .then((respuesta) => {
        const data = respuesta.data
        setFila(data && typeof data === 'object' && !Array.isArray(data) ? data as Fila : null)
        setEstado('listo')
      })
      .catch((err: unknown) => {
        console.error(err)
        setMensaje('No se pudo abrir la ficha.')
        setEstado('error')
      })
  }

  useEffect(() => { cargar() }, [id])

  if (estado === 'carga') return <Carga />
  if (estado === 'error' || !fila) return <Aviso>{mensaje || 'No se pudo abrir la ficha.'}</Aviso>
  return <FichaCuerpo id={id} fila={fila} onCambio={cargar} />
}

function FichaCuerpo({ id, fila, onCambio }: { id: string; fila: Fila; onCambio: () => void }) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const nombre = texto(fila.nombreComercial, texto(fila.nombreEmpresa, 'Negocio'))

  async function cambiar(estadoEmpresa: string) {
    if ((estadoEmpresa === 'SUSPENDIDO' || estadoEmpresa === 'INACTIVO') && motivo.trim().length < 3) {
      setError('Escribí el motivo antes de suspender o inactivar.')
      return
    }
    setOcupado(true)
    setError('')
    try {
      await adminService.setEmpresaEstado(id, estadoEmpresa, motivo.trim() || undefined)
      setMotivo('')
      onCambio()
    } catch (err) {
      console.error(err)
      setError('No se pudo cambiar el estado.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <p className="text-sm text-hc-n-600">Consola / Negocios / Ficha</p>
      <h1 className="font-display text-[22px] font-bold text-hc-n-900">{nombre}</h1>
      <section className={TARJETA}>
        <p className="text-sm text-hc-n-600">Plan {texto(fila.plan, texto(fila.planSaas, '—'))}</p>
        <p className="text-sm text-hc-n-600">Estado {texto(fila.estadoEmpresa, '—')}</p>
        <p className="text-sm text-hc-n-600">Catálogo {fila.visibilidadPublica === true ? 'visible' : 'oculto'}</p>
      </section>
      <label className="text-xs font-semibold text-hc-n-600">
        Motivo
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm" />
      </label>
      {error && <p className="text-sm text-hc-primary-text">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BOTON_PRIMARIO} disabled={ocupado} onClick={() => void cambiar('ACTIVO')}>Activar</button>
        <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => void cambiar('SUSPENDIDO')}>Suspender</button>
        <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => void cambiar('INACTIVO')}>Inactivar</button>
      </div>
    </div>
  )
}
