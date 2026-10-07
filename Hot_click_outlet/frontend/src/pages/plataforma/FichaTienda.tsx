import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminBillingService } from '@/services/adminBillingService'
import { auditoriaAdminService } from '@/services/auditoriaAdminService'
import { adminService } from '@/services/orderService'
import { consolaService, objetoDe } from './consola'
import useAuthStore from '@/store/authStore'
import type { AuthResponse } from '@/types/auth'
import { prefijoPorPlan } from '@/utils/planPaths'
import { filasDe, texto, type Fila } from './normalizar'
import { CambioPlan } from './CambioPlan'
import { NotaNegocio } from './NotaNegocio'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, Chip, Metrica, Segmento, TARJETA } from './piezas'

function colones(valor: unknown): string {
  const crudo = typeof valor === 'number' ? valor : Number(texto(valor, ''))
  if (!texto(valor, '') || !Number.isFinite(crudo)) return '—'
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(crudo)
}
const BLOQUES = [
  { id: 'productos', label: 'Inventario' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'equipo', label: 'Equipo' },
  { id: 'historia', label: 'Historia' },
  { id: 'membresia', label: 'Membresía' },
  { id: 'sancion', label: 'Sanción' },
]

export function FichaTienda({ id, alCambiar }: { id: string; alCambiar?: () => void }) {
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
  return <Cuerpo id={id} fila={fila} onCambio={() => { cargar(); alCambiar?.() }} />
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica icono="moderacion" etiqueta="Productos" valor={texto(fila.totalProductos, '—')} />
        <Metrica icono="operacion" etiqueta="Pedidos" valor={texto(fila.totalPedidos, '—')} />
        <Metrica icono="dinero" etiqueta="Ventas" valor={colones(fila.totalVentas)} />
        <Metrica icono="negocios" etiqueta="Personas" valor={texto(fila.totalUsuarios, '—')} />
      </div>
      <Cuenta id={id} fila={fila} onCambio={onCambio} />
      <NotaNegocio empresaId={id} negocio={nombre} />
      <Trabada id={id} />
      <Segmento opciones={BLOQUES} valor={bloque} onChange={setBloque} />
      {bloque === 'historia' && <Historia id={id} />}
      {bloque === 'membresia' && <Membresia id={id} />}
      {bloque === 'sancion' && <Sancion id={id} />}
      {bloque !== 'historia' && bloque !== 'membresia' && bloque !== 'sancion' && <Bloque id={id} bloque={bloque} />}
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
    <div className="grid gap-3 lg:grid-cols-2">
      <CambioPlan
        id={id}
        planActual={plan}
        negocio={texto(fila.nombreComercial, texto(fila.nombreEmpresa, 'la tienda'))}
        telefonoEmpresa={texto(fila.telefonoEmpresa)}
        ocupado={ocupado}
        setOcupado={setOcupado}
        setError={setError}
        onCambio={onCambio}
      />
      <div className={TARJETA}>
        <p className="text-xs font-semibold text-hc-n-600">Catálogo</p>
        <p className="mt-2 font-display text-lg font-bold">{visible ? 'Visible' : 'Oculto'}</p>
        <button type="button" className={`${BOTON_SECUNDARIO} mt-3 h-10`} disabled={ocupado} onClick={() => void correr(
          () => adminService.setEmpresaVisibilidad(id, !visible),
          onCambio, setError, setOcupado, 'No se pudo cambiar la visibilidad.',
        )}>{visible ? 'Ocultar catálogo' : 'Mostrar catálogo'}</button>
      </div>
      <div className={TARJETA}>
        <p className="text-xs font-semibold text-hc-n-600">Ver el negocio</p>
        <p className="mt-2 text-sm text-hc-n-900">Abre el panel de ese vendedor. Usted sigue siendo el administrador.</p>
        <button type="button" className={`${BOTON_PRIMARIO} mt-3`} disabled={ocupado} onClick={() => void verComo(id, plan, navigate, setError, setOcupado)}>
          Ver como el negocio
        </button>
      </div>
      <div className={TARJETA}>
        <label className="block text-xs font-semibold text-hc-n-600">
          Motivo, si lo suspende
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm" />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={BOTON_PRIMARIO} disabled={ocupado} onClick={() => void cambiarEstado('ACTIVO')}>Activar</button>
          <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => void cambiarEstado('SUSPENDIDO')}>Suspender</button>
          <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => void cambiarEstado('INACTIVO')}>Inactivar</button>
        </div>
      </div>
      {error && <p className="text-sm text-hc-primary-text lg:col-span-2">{error}</p>}
    </div>
  )
}

async function vendidosDe(id: string): Promise<Record<string, unknown>> {
  try {
    const extra = await consolaService.ficha(id)
    return objetoDe(objetoDe(extra.data).vendidos)
  } catch (err) {
    console.error(err)
    return {}
  }
}

function Bloque({ id, bloque }: { id: string; bloque: string }) {
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  useEffect(() => {
    setEstado('carga')
    const carga = bloque === 'productos'
      ? adminService.getEmpresaTab(id, bloque).then(async (tab) => {
          const vendidos = await vendidosDe(id)
          setFilas(filasDe(tab.data).map((fila) => ({ ...fila, vendidos30: vendidos[texto(fila.id)] })))
        })
      : adminService.getEmpresaTab(id, bloque).then((r) => setFilas(filasDe(r.data)))
    carga
      .then(() => setEstado('listo'))
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

function Trabada({ id }: { id: string }) {
  const [motivos, setMotivos] = useState<string[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  useEffect(() => {
    consolaService.ficha(id)
      .then((respuesta) => {
        const lista = objetoDe(respuesta.data).motivos
        setMotivos(Array.isArray(lista) ? lista.filter((item): item is string => typeof item === 'string') : [])
        setEstado('listo')
      })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [id])
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudo revisar por qué la tienda está trabada.</Aviso>
  if (motivos.length === 0) return <Aviso>Nada la tiene trabada ahora.</Aviso>
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">Por qué está trabada</h2>
      <ul className="mt-2 list-disc pl-5 text-sm">
        {motivos.map((motivo) => <li key={motivo}>{motivo}</li>)}
      </ul>
    </section>
  )
}

function Historia({ id }: { id: string }) {
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  useEffect(() => {
    auditoriaAdminService.listar({ empresaId: Number(id), page: 0, size: 20 })
      .then((respuesta) => { setFilas(filasDe(respuesta.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [id])
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudo cargar la historia.</Aviso>
  if (filas.length === 0) return <Aviso>Esta tienda todavía no tiene cambios anotados.</Aviso>
  return (
    <ul className="flex flex-col gap-2">
      {filas.map((fila) => (
        <li key={texto(fila.id, texto(fila.fecha))} className={TARJETA}>
          <p className="font-semibold">{texto(fila.fecha, 'Sin hora')} · {texto(fila.adminEmail, 'Operador')}</p>
          <p className="text-sm text-hc-n-600">{texto(fila.detalle, texto(fila.accion, 'Cambio'))}</p>
        </li>
      ))}
    </ul>
  )
}

function Membresia({ id }: { id: string }) {
  const [fila, setFila] = useState<Fila>({})
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  useEffect(() => {
    const numero = Number(id)
    if (!Number.isSafeInteger(numero)) {
      setEstado('error')
      return
    }
    adminBillingService.detalle(numero)
      .then((respuesta) => { setFila(objetoDe(objetoDe(respuesta.data).empresa)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [id])
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudo leer la membresía.</Aviso>
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">{texto(fila.plan, 'Sin plan')}</h2>
      <p className="mt-2 text-sm">Estado {texto(fila.estadoSuscripcion, texto(fila.estadoPlan, '—'))}</p>
      <p className="text-sm">Vence {texto(fila.fechaVencPlan, 'sin fecha')}</p>
      <p className="text-sm">Cobros fallidos {texto(fila.fallosCobro, '0')}</p>
      <p className="text-sm">Mensualidad {colones(fila.precioMensual)} · comisión {texto(fila.comisionPorcentaje, '—')}%</p>
    </section>
  )
}

const NIVELES = [
  { id: 'LEVE', label: 'Leve', detalle: '7 días' },
  { id: 'MEDIANA', label: 'Mediana', detalle: '30 días' },
  { id: 'DEFINITIVA', label: 'Definitiva', detalle: 'Sin regreso' },
] as const

function Sancion({ id }: { id: string }) {
  const [nivel, setNivel] = useState('LEVE')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  async function guardar() {
    setError('')
    setAviso('')
    try {
      const respuesta = await consolaService.sancionar(id, nivel, motivo, 'catalogo')
      const aplicada = objetoDe(respuesta.data)
      setAviso(`Quedó ${texto(aplicada.nivel, nivel)}. El catálogo se oculta y no entran altas nuevas.`)
      setMotivo('')
    } catch (err) {
      console.error(err)
      setError('Sin motivo no se guarda.')
    }
  }

  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">Sanción</h2>
      <p className="mt-1 text-sm text-hc-n-600">Elegí el nivel. El motivo es lo único que se escribe.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {NIVELES.map((opcion) => (
          <button
            key={opcion.id}
            type="button"
            onClick={() => setNivel(opcion.id)}
            className={`rounded-[14px] border px-2 py-3 text-left transition-all duration-300 motion-reduce:transition-none ${
              nivel === opcion.id ? 'scale-[1.03] border-hc-blue-600' : 'border-hc-n-200'
            }`}
          >
            <span className="block text-sm font-semibold">{opcion.label}</span>
            <span className="mt-1 block text-xs font-normal text-hc-n-600">{opcion.detalle}</span>
          </button>
        ))}
      </div>
      <label className="mt-2 block text-xs font-semibold text-hc-n-600">
        Motivo
        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-hc-n-200 px-3 py-2 text-sm" />
      </label>
      {error && <p className="mt-2 text-sm text-hc-primary-text">{error}</p>}
      {aviso && <p className="mt-2 text-sm font-semibold">{aviso}</p>}
      <button type="button" className={`${BOTON_PRIMARIO} mt-3`} onClick={() => void guardar()}>Guardar sanción</button>
    </section>
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
      texto(fila.fecha, ''),
      texto(fila.estado, '—'),
      origen,
      guia ? `guía ${guia}` : 'sin guía',
      colones(fila.total) === '—' ? '' : colones(fila.total),
    ].filter(Boolean).join(' · ')
  }
  if (bloque === 'equipo') return texto(fila.rol, '—')
  return `${texto(fila.categoria, 'Sin categoría')} · ${colones(fila.precio)} · stock ${texto(fila.stock, '0')}${texto(fila.vendidos30) ? ` · ${texto(fila.vendidos30)} vendidos en 30 días` : ''}`
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
    fallar(mensajeDe(err, 'No se pudo entrar como ese negocio.'))
  } finally {
    ocupado(false)
  }
}

function mensajeDe(err: unknown, fallo: string): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return fallo
  const data = (err as { response?: { data?: { message?: unknown } } }).response?.data
  return typeof data?.message === 'string' && data.message.trim() ? data.message : fallo
}

function esSesion(data: unknown): data is AuthResponse {
  return !!data && typeof data === 'object' && typeof (data as AuthResponse).accessToken === 'string'
}
