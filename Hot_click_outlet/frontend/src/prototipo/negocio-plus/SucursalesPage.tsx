import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Boton } from '../compartido/ui'
import { useSellerRuta } from '../compartido/SellerPlanContext'
import { formatoColon } from '@/theme/formatoColon'
import { useToast } from '@/components/ui/Toast'
import { sucursalService, type SucursalDto } from '@/services/sucursalService'
import type { AxiosError } from 'axios'

type EstadoSucursal = 'Al día' | 'Inactiva'

type SucursalVista = {
  id: string
  nombre: string
  ventasMes: number
  estado: EstadoSucursal
}

/**
 * Mis Sucursales — Negocio Plus (Figma 305:746).
 * Lista y crea vía `/api/sucursales`; ventasMes stub 0 hasta métricas reales.
 */
export default function SucursalesPage() {
  const ruta = useSellerRuta()
  const toast = useToast()
  const [sucursales, setSucursales] = useState<SucursalVista[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  useEffect(() => {
    let vivo = true
    sucursalService.getAll()
      .then(({ data }) => {
        if (!vivo) return
        setSucursales(aVista(data))
        setError(null)
      })
      .catch((err: unknown) => {
        console.error('[SucursalesPage]', err)
        if (!vivo) return
        setSucursales([])
        setError('No se pudieron cargar las sucursales.')
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => { vivo = false }
  }, [])

  const totalVentas = sucursales.reduce((acc, s) => acc + s.ventasMes, 0)

  return (
    <main className="px-5 pb-10 pt-8 md:px-12 md:py-12" data-mm="seller-sucursales">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link to={ruta('opciones')} className="mb-2 inline-block text-sm font-medium text-hc-primary md:hidden">
            ← Volver
          </Link>
          <h1 className="font-display text-[22px] font-bold md:text-[28px]">Mis Sucursales</h1>
          <p className="mt-1 text-xs text-hc-muted md:text-sm">
            Ventas e inventario consolidado de tu grupo
          </p>
        </div>
        <div className="hidden md:block md:min-w-[220px]">
          <Boton onClick={() => setMostrarForm(true)}>+ Agregar sucursal</Boton>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:max-w-[480px]">
        <StatCard etiqueta="Sucursales" valor={String(sucursales.length)} />
        <StatCard etiqueta="Ventas totales" valor={formatoColon(totalVentas)} />
      </div>

      <div className="mt-4 md:hidden">
        <Boton onClick={() => setMostrarForm(true)}>+ Agregar sucursal</Boton>
      </div>

      {cargando ? <p className="mt-4 text-sm text-hc-muted">Cargando sucursales…</p> : null}
      {error ? <p className="mt-4 text-sm text-hc-danger">{error}</p> : null}
      {!cargando && !error && sucursales.length === 0 ? (
        <p className="mt-6 text-sm text-hc-muted md:max-w-[760px]">
          Todavía no hay sucursales. Agregá la primera para empezar.
        </p>
      ) : null}

      <ul className="mt-6 flex flex-col gap-3 md:max-w-[760px]">
        {sucursales.map((sucursal) => (
          <FilaSucursal key={sucursal.id} sucursal={sucursal} />
        ))}
      </ul>

      {mostrarForm ? (
        <FormularioSucursal
          onCerrar={() => setMostrarForm(false)}
          onCreada={(nueva) => {
            setSucursales((prev) => [...prev, aUnaVista(nueva)])
            setMostrarForm(false)
            toast({ message: 'Sucursal creada', type: 'success' })
          }}
        />
      ) : null}
    </main>
  )
}

function aVista(data: unknown): SucursalVista[] {
  const lista = Array.isArray(data) ? data as SucursalDto[] : []
  return lista.map(aUnaVista)
}

function aUnaVista(s: SucursalDto): SucursalVista {
  return {
    id: String(s.id),
    nombre: s.nombre,
    ventasMes: typeof s.ventasMes === 'number' ? s.ventasMes : 0,
    estado: s.activo === false ? 'Inactiva' : 'Al día',
  }
}

function StatCard({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl bg-hc-surface-2 px-3 py-3.5">
      <p className="text-[10px] text-hc-muted md:text-xs">{etiqueta}</p>
      <p className="mt-1 font-display text-base font-bold md:text-lg">{valor}</p>
    </div>
  )
}

function FilaSucursal({ sucursal }: { sucursal: SucursalVista }) {
  const letra = sucursal.nombre.slice(0, 1).toUpperCase()
  const alDia = sucursal.estado === 'Al día'
  return (
    <li className="flex items-center gap-3 rounded-[10px] border border-hc-border bg-hc-surface p-3.5 md:px-4 md:py-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--hc-n-100)] text-[15px] font-bold text-hc-muted md:size-12">
        {letra}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium md:text-[15px] md:font-semibold">{sucursal.nombre}</p>
        <p className="text-[11px] text-hc-muted md:text-[13px]">
          {formatoColon(sucursal.ventasMes)} este mes
        </p>
      </div>
      <span
        className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium md:text-xs"
        style={{
          background: alDia ? 'var(--hc-warning-bg)' : '#FFE5D9',
          color: alDia ? 'var(--hc-warning)' : '#BF590D',
        }}
      >
        {sucursal.estado}
      </span>
    </li>
  )
}

function FormularioSucursal({
  onCerrar,
  onCreada,
}: {
  onCerrar: () => void
  onCreada: (s: SucursalDto) => void
}) {
  const toast = useToast()
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const valor = nombre.trim()
    if (!valor) {
      toast({ message: 'Escribí el nombre de la sucursal', type: 'error' })
      return
    }
    setEnviando(true)
    try {
      const { data } = await sucursalService.create(valor)
      onCreada(data)
    } catch (err: unknown) {
      console.error('[SucursalesPage] create', err)
      const ax = err as AxiosError<{ message?: string }>
      toast({
        message: ax.response?.data?.message ?? 'No se pudo crear la sucursal',
        type: 'error',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 md:items-center">
      <form
        onSubmit={enviar}
        className="w-full max-w-md rounded-2xl border border-hc-border bg-hc-surface p-5 shadow-lg"
      >
        <h2 className="font-display text-lg font-bold">Agregar sucursal</h2>
        <label className="mt-4 block text-xs font-medium text-hc-muted" htmlFor="sucursal-nombre">
          Nombre
        </label>
        <input
          id="sucursal-nombre"
          className="mt-1 w-full rounded-lg border border-hc-border bg-hc-surface-2 px-3 py-2.5 text-sm outline-none focus:border-hc-primary"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. San José Centro"
          maxLength={120}
          autoFocus
          disabled={enviando}
        />
        <div className="mt-5 flex flex-wrap gap-2">
          <Boton type="submit">{enviando ? 'Guardando…' : 'Crear'}</Boton>
          <button
            type="button"
            className="min-h-11 px-3 text-sm font-semibold text-hc-muted"
            onClick={onCerrar}
            disabled={enviando}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
