import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '@/services/orderService'
import useAuthStore from '@/store/authStore'
import type { AuthResponse } from '@/types/auth'
import { prefijoPorPlan } from '@/utils/planPaths'
import { filasDe, texto, type Fila } from './normalizar'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, Chip, Metrica, Segmento, TARJETA } from './piezas'

const PLANES = ['EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS'] as const

function colones(valor: unknown): string {
  const crudo = typeof valor === 'number' ? valor : Number(texto(valor, ''))
  if (!texto(valor, '') || !Number.isFinite(crudo)) return '—'
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(crudo)
}
const BLOQUES = [
  { id: 'productos', label: 'Productos' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'equipo', label: 'Equipo' },
]

export function FichaTienda({ id }: { id: string }) {
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
  return <Cuerpo id={id} fila={fila} onCambio={cargar} />
}

function Cuerpo({ id, fila, onCambio }: { id: string; fila: Fila; onCambio: () => void }) {
  const [bloque, setBloque] = useState('productos')
  const nombre = texto(fila.nombreComercial, texto(fila.nombreEmpresa, 'Negocio'))
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-sm text-hc-n-600">Tiendas / Ficha</p>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-[28px] font-extrabold leading-8 text-hc-n-900">{nombre}</h1>
        <Chip tono={texto(fila.estadoEmpresa).toUpperCase() === 'ACTIVO' ? 'ok' : 'alerta'}>{texto(fila.estadoEmpresa, '—')}</Chip>
        <Chip tono="azul">{texto(fila.plan, texto(fila.planSaas, 'Sin plan'))}</Chip>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica icono="moderacion" etiqueta="Productos" valor={texto(fila.totalProductos, '—')} />
        <Metrica icono="operacion" etiqueta="Pedidos" valor={texto(fila.totalPedidos, '—')} />
        <Metrica icono="dinero" etiqueta="Ventas" valor={colones(fila.totalVentas)} />
        <Metrica icono="negocios" etiqueta="Personas" valor={texto(fila.totalUsuarios, '—')} />
      </div>
      <Cuenta id={id} fila={fila} onCambio={onCambio} />
      <Segmento opciones={BLOQUES} valor={bloque} onChange={setBloque} />
      <Bloque id={id} bloque={bloque} />
    </div>
  )
}

function Cuenta({ id, fila, onCambio }: { id: string; fila: Fila; onCambio: () => void }) {
  const navigate = useNavigate()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const plan = texto(fila.plan, texto(fila.planSaas, 'EMPRENDEDOR'))
  const visible = fila.visibilidadPublica === true

  async function cambiarEstado(estadoEmpresa: string) {
    if ((estadoEmpresa === 'SUSPENDIDO' || estadoEmpresa === 'INACTIVO') && motivo.trim().length < 3) {
      setError('Escribí el motivo antes de suspender o inactivar.')
      return
    }
    await correr(async () => {
      await adminService.setEmpresaEstado(id, estadoEmpresa, motivo.trim() || undefined)
      setMotivo('')
    }, onCambio, setError, setOcupado, 'No se pudo cambiar el estado.')
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={`${TARJETA} block min-w-0 text-xs font-semibold text-hc-n-600 sm:col-span-2`}>
        Plan
        <select
          value={PLANES.includes(plan as typeof PLANES[number]) ? plan : 'EMPRENDEDOR'}
          onChange={(e) => void correr(
            () => adminService.setEmpresaPlan(id, e.target.value),
            onCambio, setError, setOcupado, 'No se pudo cambiar el plan.',
          )}
          className="mt-2 h-12 w-full rounded-xl border border-hc-n-200 bg-white px-3 text-sm font-medium text-hc-n-900"
        >
          {PLANES.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
        </select>
      </label>
      <div className={TARJETA}>
        <p className="text-xs font-semibold text-hc-n-600">Catálogo</p>
        <p className="mt-2 font-display text-lg font-bold">{visible ? 'Visible' : 'Oculto'}</p>
        <button type="button" className={`${BOTON_SECUNDARIO} mt-3 h-10`} disabled={ocupado} onClick={() => void correr(
          () => adminService.setEmpresaVisibilidad(id, !visible),
          onCambio, setError, setOcupado, 'No se pudo cambiar la visibilidad.',
        )}>{visible ? 'Ocultar catálogo' : 'Mostrar catálogo'}</button>
      </div>
      <label className={`${TARJETA} block text-xs font-semibold text-hc-n-600 sm:col-span-2`}>
        Motivo
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm" />
      </label>
      {error && <p className="text-sm text-hc-primary-text sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="button" className={BOTON_PRIMARIO} disabled={ocupado} onClick={() => void cambiarEstado('ACTIVO')}>Activar</button>
        <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => void cambiarEstado('SUSPENDIDO')}>Suspender</button>
        <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => void cambiarEstado('INACTIVO')}>Inactivar</button>
        <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => void verComo(id, plan, navigate, setError, setOcupado)}>
          Ver como el negocio
        </button>
      </div>
    </div>
  )
}

function Bloque({ id, bloque }: { id: string; bloque: string }) {
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  useEffect(() => {
    setEstado('carga')
    adminService.getEmpresaTab(id, bloque)
      .then((r) => { setFilas(filasDe(r.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [id, bloque])
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudo cargar este bloque.</Aviso>
  if (filas.length === 0) return <Aviso>Nada en este bloque.</Aviso>
  return (
    <ul className="flex flex-col gap-2">
      {filas.map((fila) => (
        <li key={`${bloque}-${texto(fila.id, texto(fila.nombre, 'fila'))}`} className={TARJETA}>
          <p className="font-semibold">{tituloBloque(bloque, fila)}</p>
          <p className="text-xs text-hc-n-600">{metaBloque(bloque, fila)}</p>
        </li>
      ))}
    </ul>
  )
}

function tituloBloque(bloque: string, fila: Fila): string {
  if (bloque === 'pedidos') return texto(fila.cliente, texto(fila.id, 'Pedido'))
  if (bloque === 'equipo') return texto(fila.nombre, 'Persona')
  return texto(fila.nombre, 'Producto')
}

function metaBloque(bloque: string, fila: Fila): string {
  if (bloque === 'pedidos') {
    const guia = texto(fila.numeroGuia)
    const origen = texto(fila.origen)
    return [
      texto(fila.estado, '—'),
      origen,
      guia ? `guía ${guia}` : 'sin guía',
      colones(fila.total) === '—' ? '' : colones(fila.total),
    ].filter(Boolean).join(' · ')
  }
  if (bloque === 'equipo') return texto(fila.rol, '—')
  return `${texto(fila.categoria, 'Sin categoría')} · ${colones(fila.precio)} · stock ${texto(fila.stock, '0')}`
}

async function correr(
  accion: () => Promise<unknown>,
  listo: () => void,
  fallar: (mensaje: string) => void,
  ocupado: (valor: boolean) => void,
  fallo: string,
) {
  ocupado(true)
  fallar('')
  try {
    await accion()
    listo()
  } catch (err) {
    console.error(err)
    fallar(fallo)
  } finally {
    ocupado(false)
  }
}

async function verComo(
  id: string,
  plan: string,
  navigate: (to: string) => void,
  fallar: (mensaje: string) => void,
  ocupado: (valor: boolean) => void,
) {
  ocupado(true)
  fallar('')
  try {
    const respuesta = await adminService.impersonarEmpresa(id)
    if (!esSesion(respuesta.data)) {
      fallar('No se pudo entrar como ese negocio.')
      return
    }
    useAuthStore.getState().impersonar(respuesta.data)
    navigate(prefijoPorPlan(plan))
  } catch (err) {
    console.error(err)
    fallar('No se pudo entrar como ese negocio.')
  } finally {
    ocupado(false)
  }
}

function esSesion(data: unknown): data is AuthResponse {
  return !!data && typeof data === 'object' && typeof (data as AuthResponse).accessToken === 'string'
}
