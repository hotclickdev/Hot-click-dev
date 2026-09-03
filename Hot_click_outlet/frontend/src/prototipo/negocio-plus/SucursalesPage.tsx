import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Boton, Campo } from '../compartido/ui'
import { useSellerRuta } from '../compartido/SellerPlanContext'
import FormularioPorPasos from '../compartido/FormularioPorPasos'
import { formatoColon } from '@/theme/formatoColon'
import { useToast } from '@/components/ui/Toast'
import { sucursalService, type SucursalDto } from '@/services/sucursalService'
import {
  PASOS_RENOMBRAR_SUCURSAL,
  PASOS_SUCURSAL,
  validarPasoRenombrarSucursal,
  validarPasoSucursal,
} from './sucursalPasos'
import type { AxiosError } from 'axios'

type EstadoSucursal = 'Al día' | 'Inactiva'

type SucursalVista = {
  id: string
  nombre: string
  ventasMes: number
  estado: EstadoSucursal
}

type AccionLista =
  | { tipo: 'crear' }
  | { tipo: 'renombrar'; sucursal: SucursalVista }
  | { tipo: 'desactivar'; sucursal: SucursalVista }

/**
 * Mis Sucursales — Negocio Plus (Figma 305:746).
 * Lista, crea, renombra y desactiva vía `/api/sucursales`.
 */
export default function SucursalesPage() {
  const ruta = useSellerRuta()
  const toast = useToast()
  const [sucursales, setSucursales] = useState<SucursalVista[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accion, setAccion] = useState<AccionLista | null>(null)

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
  const pendienteDesactivar = accion?.tipo === 'desactivar' ? accion.sucursal : null

  return (
    <main className="px-5 pb-10 pt-8 md:px-12 md:py-12" data-mm="seller-sucursales">
      <CabeceraSucursales
        rutaOpciones={ruta('opciones')}
        onAgregar={() => setAccion({ tipo: 'crear' })}
        ocultarAgregar={pendienteDesactivar != null}
      />

      <div className="mt-5 grid grid-cols-2 gap-3 md:max-w-[480px]">
        <StatCard etiqueta="Sucursales" valor={String(sucursales.length)} />
        <StatCard etiqueta="Ventas totales" valor={formatoColon(totalVentas)} />
      </div>

      {!pendienteDesactivar ? (
        <div className="mt-4 md:hidden">
          <Boton onClick={() => setAccion({ tipo: 'crear' })}>+ Agregar sucursal</Boton>
        </div>
      ) : null}

      {cargando ? <p className="mt-4 text-sm text-hc-muted">Cargando sucursales…</p> : null}
      {error ? <p className="mt-4 text-sm text-hc-danger">{error}</p> : null}
      {!cargando && !error && sucursales.length === 0 ? (
        <p className="mt-6 text-sm text-hc-muted md:max-w-[760px]">
          Todavía no hay sucursales. Agregá la primera para empezar.
        </p>
      ) : null}

      {pendienteDesactivar ? (
        <ConfirmacionDesactivar
          sucursal={pendienteDesactivar}
          onCancelar={() => setAccion(null)}
          onDesactivada={() => {
            setSucursales((prev) => prev.filter((s) => s.id !== pendienteDesactivar.id))
            setAccion(null)
            toast({ message: 'Sucursal desactivada', type: 'success' })
          }}
        />
      ) : (
        <ul className="mt-6 flex flex-col gap-3 md:max-w-[760px]">
          {sucursales.map((sucursal) => (
            <FilaSucursal
              key={sucursal.id}
              sucursal={sucursal}
              onRenombrar={() => setAccion({ tipo: 'renombrar', sucursal })}
              onDesactivar={() => setAccion({ tipo: 'desactivar', sucursal })}
            />
          ))}
        </ul>
      )}

      {accion?.tipo === 'crear' ? (
        <FormularioSucursal
          onCerrar={() => setAccion(null)}
          onCreada={(nueva) => {
            setSucursales((prev) => [...prev, aUnaVista(nueva)])
            setAccion(null)
            toast({ message: 'Sucursal creada', type: 'success' })
          }}
        />
      ) : null}

      {accion?.tipo === 'renombrar' ? (
        <FormularioRenombrar
          sucursal={accion.sucursal}
          onCerrar={() => setAccion(null)}
          onRenombrada={(actualizada) => {
            setSucursales((prev) =>
              prev.map((s) => (s.id === String(actualizada.id) ? aUnaVista(actualizada) : s)),
            )
            setAccion(null)
            toast({ message: 'Sucursal actualizada', type: 'success' })
          }}
        />
      ) : null}
    </main>
  )
}

function CabeceraSucursales({
  rutaOpciones,
  onAgregar,
  ocultarAgregar,
}: {
  rutaOpciones: string
  onAgregar: () => void
  ocultarAgregar: boolean
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <Link to={rutaOpciones} className="mb-2 inline-block text-sm font-medium text-hc-primary md:hidden">
          ← Volver
        </Link>
        <h1 className="font-display text-[22px] font-bold md:text-[28px]">Mis Sucursales</h1>
        <p className="mt-1 text-xs text-hc-muted md:text-sm">
          Ventas e inventario consolidado de tu grupo
        </p>
      </div>
      {!ocultarAgregar ? (
        <div className="hidden md:block md:min-w-[220px]">
          <Boton onClick={onAgregar}>+ Agregar sucursal</Boton>
        </div>
      ) : null}
    </div>
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

function mensajeErrorApi(err: unknown, fallback: string): string {
  const ax = err as AxiosError<{ message?: string }>
  return ax.response?.data?.message ?? fallback
}

function StatCard({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl bg-hc-surface-2 px-3 py-3.5">
      <p className="text-[10px] text-hc-muted md:text-xs">{etiqueta}</p>
      <p className="mt-1 font-display text-base font-bold md:text-lg">{valor}</p>
    </div>
  )
}

function FilaSucursal({
  sucursal,
  onRenombrar,
  onDesactivar,
}: {
  sucursal: SucursalVista
  onRenombrar: () => void
  onDesactivar: () => void
}) {
  const letra = sucursal.nombre.slice(0, 1).toUpperCase()
  const alDia = sucursal.estado === 'Al día'
  return (
    <li className="flex flex-col gap-3 rounded-[10px] border border-hc-border bg-hc-surface p-3.5 md:flex-row md:items-center md:px-4 md:py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
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
      </div>
      <div className="flex gap-2 md:shrink-0">
        <Boton variante="contorno" onClick={onRenombrar}>Renombrar</Boton>
        <Boton variante="contorno" onClick={onDesactivar}>Desactivar</Boton>
      </div>
    </li>
  )
}

function ConfirmacionDesactivar({
  sucursal,
  onCancelar,
  onDesactivada,
}: {
  sucursal: SucursalVista
  onCancelar: () => void
  onDesactivada: () => void
}) {
  const toast = useToast()
  const [enviando, setEnviando] = useState(false)

  async function confirmar() {
    setEnviando(true)
    try {
      await sucursalService.desactivar(sucursal.id)
      onDesactivada()
    } catch (err: unknown) {
      console.error('[SucursalesPage] desactivar', err)
      toast({
        message: mensajeErrorApi(err, 'No se pudo desactivar la sucursal'),
        type: 'error',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-6 md:max-w-[760px]">
      <div className="rounded-xl border border-hc-border bg-hc-surface p-4 space-y-2">
        <p className="text-sm font-semibold text-hc-text">{sucursal.nombre}</p>
        <p className="text-[13px] text-hc-muted">
          {formatoColon(sucursal.ventasMes)} este mes · {sucursal.estado}
        </p>
      </div>
      <p className="mt-5 text-[15px] font-semibold text-hc-text">
        ¿Desactivar esta sucursal?
      </p>
      <p className="mt-2 text-sm text-hc-muted">
        Dejará de aparecer en la lista. Podés crear otra después si la necesitás.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Boton disabled={enviando} onClick={() => void confirmar()}>
          {enviando ? 'Desactivando…' : 'Sí, desactivar'}
        </Boton>
        <Boton variante="contorno" disabled={enviando} onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </div>
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
  const [paso, setPaso] = useState(0)
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const idPaso = PASOS_SUCURSAL[paso]?.id

  async function crear() {
    setEnviando(true)
    try {
      const { data } = await sucursalService.create({
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim(),
      })
      onCreada(data)
    } catch (err: unknown) {
      console.error('[SucursalesPage] create', err)
      toast({
        message: mensajeErrorApi(err, 'No se pudo crear la sucursal'),
        type: 'error',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <ModalSucursal titulo="Agregar sucursal" tituloId="sucursal-modal-titulo" onCerrar={onCerrar} enviando={enviando}>
      <FormularioPorPasos
        pasos={PASOS_SUCURSAL}
        pasoActual={paso}
        onPasoChange={setPaso}
        validarPaso={(i) => validarPasoSucursal(i, { nombre, ubicacion })}
        onFinalizar={crear}
        etiquetaFinal="Crear sucursal"
        enviando={enviando}
      >
        {idPaso === 'nombre' ? (
          <Campo
            etiqueta="Nombre"
            value={nombre}
            onChange={setNombre}
            placeholder="Ej. San José Centro"
          />
        ) : null}
        {idPaso === 'ubicacion' ? (
          <Campo
            etiqueta="Ubicación"
            value={ubicacion}
            onChange={setUbicacion}
            placeholder="Ej. San José, Av. Central"
          />
        ) : null}
        {idPaso === 'confirmar' ? (
          <ResumenSucursal nombre={nombre.trim()} ubicacion={ubicacion.trim()} />
        ) : null}
      </FormularioPorPasos>
    </ModalSucursal>
  )
}

function FormularioRenombrar({
  sucursal,
  onCerrar,
  onRenombrada,
}: {
  sucursal: SucursalVista
  onCerrar: () => void
  onRenombrada: (s: SucursalDto) => void
}) {
  const toast = useToast()
  const [paso, setPaso] = useState(0)
  const [nombre, setNombre] = useState(sucursal.nombre)
  const [enviando, setEnviando] = useState(false)
  const idPaso = PASOS_RENOMBRAR_SUCURSAL[paso]?.id

  async function guardar() {
    setEnviando(true)
    try {
      const { data } = await sucursalService.renombrar(sucursal.id, nombre.trim())
      onRenombrada(data)
    } catch (err: unknown) {
      console.error('[SucursalesPage] renombrar', err)
      toast({
        message: mensajeErrorApi(err, 'No se pudo renombrar la sucursal'),
        type: 'error',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <ModalSucursal titulo="Renombrar sucursal" tituloId="sucursal-renombrar-titulo" onCerrar={onCerrar} enviando={enviando}>
      <FormularioPorPasos
        pasos={PASOS_RENOMBRAR_SUCURSAL}
        pasoActual={paso}
        onPasoChange={setPaso}
        validarPaso={(i) => validarPasoRenombrarSucursal(i, nombre)}
        onFinalizar={guardar}
        etiquetaFinal="Guardar nombre"
        enviando={enviando}
      >
        {idPaso === 'nombre' ? (
          <Campo
            etiqueta="Nombre"
            value={nombre}
            onChange={setNombre}
            placeholder="Ej. San José Centro"
          />
        ) : null}
        {idPaso === 'confirmar' ? (
          <ResumenRenombre anterior={sucursal.nombre} nuevo={nombre.trim()} />
        ) : null}
      </FormularioPorPasos>
    </ModalSucursal>
  )
}

function ModalSucursal({
  titulo,
  tituloId,
  onCerrar,
  enviando,
  children,
}: {
  titulo: string
  tituloId: string
  onCerrar: () => void
  enviando: boolean
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 md:items-center">
      <div
        className="w-full max-w-md rounded-2xl border border-hc-border bg-hc-surface p-5 shadow-lg"
        role="dialog"
        aria-labelledby={tituloId}
      >
        <h2 id={tituloId} className="font-display text-lg font-bold">
          {titulo}
        </h2>
        <div className="mt-4">{children}</div>
        <button
          type="button"
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-[14px] py-3 text-[13px] font-medium text-hc-muted disabled:opacity-40"
          onClick={onCerrar}
          disabled={enviando}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function ResumenSucursal({ nombre, ubicacion }: { nombre: string; ubicacion: string }) {
  const letra = nombre.slice(0, 1).toUpperCase()
  return (
    <div className="rounded-xl border border-hc-border bg-hc-surface-2 p-4">
      <p className="text-xs text-hc-muted">Vas a crear esta sucursal:</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--hc-n-100)] text-[15px] font-bold text-hc-muted">
          {letra}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-hc-text">{nombre}</p>
          <p className="mt-0.5 truncate text-xs text-hc-muted">{ubicacion}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-hc-muted">
        Podés agregar más sucursales después para consolidar ventas e inventario.
      </p>
    </div>
  )
}

function ResumenRenombre({ anterior, nuevo }: { anterior: string; nuevo: string }) {
  return (
    <div className="rounded-xl border border-hc-border bg-hc-surface-2 p-4">
      <p className="text-xs text-hc-muted">Vas a cambiar el nombre:</p>
      <p className="mt-3 text-sm text-hc-muted line-through">{anterior}</p>
      <p className="mt-1 text-[15px] font-semibold text-hc-text">{nuevo}</p>
    </div>
  )
}
