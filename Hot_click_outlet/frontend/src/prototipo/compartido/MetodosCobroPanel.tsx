import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { Link } from 'react-router-dom'
import {
  BuildingLibraryIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { useToast } from '@/components/ui/Toast'
import { Boton } from './ui'
import {
  cargarMetodosCobro,
  marcarMetodoPredeterminado,
  type MetodoCobro,
  type TipoMetodoCobro,
} from './metodosCobroDatos'

type IconoHero = ComponentType<SVGProps<SVGSVGElement>>

const ICONO: Record<TipoMetodoCobro, IconoHero> = {
  sinpe: DevicePhoneMobileIcon,
  iban: BuildingLibraryIcon,
  tarjeta: CreditCardIcon,
}

const POZO: Record<TipoMetodoCobro, string> = {
  sinpe: 'bg-[var(--hc-info-bg)] text-[var(--hc-info)]',
  iban: 'bg-[var(--hc-n-100)] text-hc-text',
  tarjeta: 'bg-[var(--hc-red-50)] text-hc-primary',
}

type Props = {
  agregarTo: string
}

/**
 * Cuentas donde el vendedor recibe el dinero de sus ventas (API /metodos-cobro).
 */
export default function MetodosCobroPanel({ agregarTo }: Props) {
  const toast = useToast()
  const [metodos, setMetodos] = useState<MetodoCobro[]>([])
  const [modoDemo, setModoDemo] = useState(false)
  const [predeterminadoId, setPredeterminadoId] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [pendienteId, setPendienteId] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    setCargando(true)
    cargarMetodosCobro()
      .then((carga) => {
        if (!vivo) return
        setMetodos(carga.metodos)
        setModoDemo(carga.fuente === 'demo')
        const pred = carga.metodos.find((m) => m.predeterminado) ?? carga.metodos[0]
        setPredeterminadoId(pred?.id ?? '')
        if (carga.fuente === 'demo') {
          toast({ message: 'Modo demo: métodos de ejemplo (API no disponible)', type: 'info' })
        }
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => { vivo = false }
  }, [toast])

  function pedirConfirmacion(id: string) {
    if (id === predeterminadoId) return
    setPendienteId(id)
  }

  async function confirmarPredeterminado() {
    if (!pendienteId) return
    const id = pendienteId
    if (modoDemo || id.startsWith('demo-')) {
      setPredeterminadoId(id)
      setPendienteId(null)
      return
    }
    setGuardandoId(id)
    try {
      const actualizado = await marcarMetodoPredeterminado(id)
      setMetodos((prev) =>
        prev.map((m) => ({
          ...m,
          predeterminado: m.id === actualizado.id,
        })),
      )
      setPredeterminadoId(actualizado.id)
      setPendienteId(null)
    } catch {
      toast({ message: 'No se pudo marcar como predeterminado', type: 'error' })
    } finally {
      setGuardandoId(null)
    }
  }

  if (cargando) {
    return <p className="text-[13px] text-hc-muted">Cargando métodos de cobro…</p>
  }

  const pendiente = pendienteId ? metodos.find((m) => m.id === pendienteId) : null

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl bg-[var(--hc-info-bg)] px-4 py-3 text-[13px] leading-5 text-[var(--hc-info)]">
        El cliente paga en la tienda. Acá elegís a qué cuenta te llega el ingreso.
      </p>
      {modoDemo ? (
        <p
          role="status"
          className="rounded-xl bg-[var(--hc-n-50)] px-4 py-3 text-[13px] leading-5 text-hc-muted"
        >
          Modo demo: la API de cobro no está disponible. Los datos son de ejemplo y no se guardan.
        </p>
      ) : null}
      {pendiente ? (
        <ConfirmacionPredeterminado
          metodo={pendiente}
          guardando={guardandoId !== null}
          onConfirmar={() => void confirmarPredeterminado()}
          onCancelar={() => setPendienteId(null)}
        />
      ) : metodos.length === 0 ? (
        <p className="text-[13px] text-hc-muted">Todavía no tenés una cuenta para recibir ingresos.</p>
      ) : (
        <div role="radiogroup" aria-label="Cuenta predeterminada para recibir ingresos" className="flex flex-col gap-3">
          {metodos.map((metodo) => (
            <MetodoCobroFila
              key={metodo.id}
              metodo={metodo}
              predeterminado={metodo.id === predeterminadoId}
              disabled={guardandoId !== null}
              onElegir={() => pedirConfirmacion(metodo.id)}
            />
          ))}
        </div>
      )}
      {!pendiente ? (
        <Link
          to={agregarTo}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-hc-border py-3.5 text-[13px] font-medium text-hc-text"
        >
          <PlusIcon className="size-4" aria-hidden />
          Agregar método de cobro
        </Link>
      ) : null}
    </div>
  )
}

type ConfirmacionProps = Readonly<{
  metodo: MetodoCobro
  guardando: boolean
  onConfirmar: () => void
  onCancelar: () => void
}>

function ConfirmacionPredeterminado({ metodo, guardando, onConfirmar, onCancelar }: ConfirmacionProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-hc-border bg-hc-surface p-4">
      <p className="text-sm font-semibold text-hc-text">{metodo.nombre}</p>
      <p className="font-mono text-[13px] text-hc-text">{metodo.mascara}</p>
      <p className="text-sm text-hc-muted">¿Usar esta cuenta para recibir ingresos?</p>
      <Boton disabled={guardando} onClick={onConfirmar}>
        {guardando ? 'Guardando…' : 'Sí, usar esta cuenta'}
      </Boton>
      <Boton variante="contorno" disabled={guardando} onClick={onCancelar}>
        Cancelar
      </Boton>
    </div>
  )
}

type FilaProps = {
  metodo: MetodoCobro
  predeterminado: boolean
  disabled: boolean
  onElegir: () => void
}

function MetodoCobroFila({ metodo, predeterminado, disabled, onElegir }: FilaProps) {
  const Icono = ICONO[metodo.tipo]
  const marco = predeterminado
    ? 'border-[var(--hc-blue-300)] bg-[var(--hc-blue-50)]'
    : 'border-hc-border bg-hc-surface hover:border-[var(--hc-border-strong)]'
  return (
    <button
      type="button"
      role="radio"
      aria-checked={predeterminado}
      disabled={disabled}
      onClick={onElegir}
      className={`flex min-h-11 w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hc-info)] disabled:opacity-60 ${marco}`}
    >
      <span className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl ${POZO[metodo.tipo]}`}>
        <Icono className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold text-hc-text">{metodo.nombre}</span>
          {predeterminado ? (
            <span className="rounded-full bg-[var(--hc-success-bg)] px-2 py-0.5 text-[10px] font-medium text-hc-success">
              Predeterminado
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block font-mono text-[13px] tracking-wide text-hc-text">{metodo.mascara}</span>
        <span className="mt-1 block text-[12px] text-hc-muted">{metodo.nota}</span>
        {!predeterminado ? (
          <span className="mt-2 block text-[12px] font-medium text-[var(--hc-info)]">Usar para recibir ingresos</span>
        ) : null}
      </span>
      <span
        className={`mt-1 size-4 shrink-0 rounded-full border-2 ${
          predeterminado ? 'border-[var(--hc-info)] bg-[var(--hc-info)]' : 'border-hc-border bg-hc-surface'
        }`}
        aria-hidden
      />
    </button>
  )
}
