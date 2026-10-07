import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { IconoDominio } from './iconos'

export const TARJETA = 'rounded-[14px] border border-hc-n-200 bg-white p-3.5'
export const TITULO = 'font-display text-[17px] font-bold leading-6 text-hc-n-900'
export const BOTON_PRIMARIO = 'inline-flex h-12 items-center justify-center rounded-xl bg-hc-primary px-4 text-[15px] font-semibold text-white disabled:opacity-60'
export const BOTON_SECUNDARIO = 'inline-flex h-12 items-center justify-center rounded-xl border border-hc-n-200 bg-white px-4 text-sm font-semibold text-hc-n-900 disabled:opacity-60'

export function MarcoIcono({ id }: { id: string }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-hc-blue-50 text-hc-blue-600">
      <IconoDominio id={id} />
    </span>
  )
}

const TONO_CHIP = {
  neutro: 'bg-hc-n-100 text-hc-n-600',
  ok: 'bg-hc-success-bg text-hc-success-text',
  alerta: 'bg-hc-danger-bg text-hc-primary-text',
  azul: 'bg-hc-blue-50 text-hc-blue-600',
} as const

export function Chip({ children, tono = 'neutro' }: { children: string; tono?: keyof typeof TONO_CHIP }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONO_CHIP[tono]}`}>{children}</span>
}

export function Metrica({ icono, etiqueta, valor }: { icono: string; etiqueta: string; valor: string }) {
  return (
    <article className={`${TARJETA} flex min-w-0 items-center gap-3`}>
      <MarcoIcono id={icono} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-hc-n-600">{etiqueta}</span>
        <span className="mt-1 block whitespace-nowrap font-display text-[22px] font-extrabold leading-none tracking-tight text-hc-n-900">{valor}</span>
      </span>
    </article>
  )
}

export function Encabezado({ titulo, detalle, marca }: { titulo: string; detalle?: string; marca?: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[28px] font-extrabold leading-8 text-hc-n-900">{titulo}</h1>
        {detalle && <p className="mt-1 max-w-xl text-sm text-hc-n-600">{detalle}</p>}
      </div>
      {marca && <p className="font-display text-[40px] font-extrabold leading-none text-hc-blue-600">{marca}</p>}
    </header>
  )
}

export function Marco({ principal, lado }: { principal: ReactNode; lado: ReactNode }) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-4">{principal}</div>
      <aside className="flex flex-col gap-3">{lado}</aside>
    </div>
  )
}

export function Segmento({ opciones, valor, onChange }: {
  opciones: Array<{ id: string; label: string }>
  valor: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-hc-n-100 p-1" role="tablist">
      {opciones.map((opcion) => (
        <button
          key={opcion.id}
          type="button"
          role="tab"
          aria-selected={valor === opcion.id}
          onClick={() => onChange(opcion.id)}
          className={valor === opcion.id
            ? 'rounded-[10px] bg-white px-3 py-2 text-sm font-semibold text-hc-blue-600 shadow-[0_1px_3px_rgba(20,23,28,.12)]'
            : 'rounded-[10px] px-3 py-2 text-sm font-medium text-hc-n-600'}
        >
          {opcion.label}
        </button>
      ))}
    </div>
  )
}

export function Aviso({ children }: { children: string }) {
  return <p className={`${TARJETA} text-sm text-hc-n-600`}>{children}</p>
}

export function Carga() {
  return <p className={`${TARJETA} text-sm text-hc-n-600`}>Cargando…</p>
}

export function EnlaceDominio({ to, children }: { to: string; children: string }) {
  return (
    <NavLink to={to} className="text-sm font-semibold text-hc-blue-600">
      {children}
    </NavLink>
  )
}

export function FilaDecision({ titulo, meta, icono = 'moderacion', onAprobar, onRechazar }: {
  titulo: string
  meta: string
  icono?: string
  onAprobar: () => Promise<void>
  onRechazar: (motivo: string) => Promise<void>
}) {
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  async function correr(accion: () => Promise<void>) {
    setOcupado(true)
    setError('')
    try {
      await accion()
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar la decisión.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <article className={TARJETA}>
      <div className="flex items-start gap-3">
        <MarcoIcono id={icono} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={TITULO}>{titulo}</h3>
            <Chip tono="alerta">Pendiente</Chip>
          </div>
          <p className="mt-1 text-xs leading-5 text-hc-n-600">{meta}</p>
        </div>
      </div>
      <label className="mt-3 block text-xs font-semibold text-hc-n-600">
        Motivo si rechazás
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="mt-1 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm text-hc-n-900 outline-none focus:border-hc-blue-600 focus:shadow-[0_0_0_3px_var(--hc-blue-100)]"
        />
      </label>
      {error && <p className="mt-2 text-sm text-hc-primary-text">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={BOTON_PRIMARIO} disabled={ocupado} onClick={() => void correr(onAprobar)}>
          Aprobar
        </button>
        <button
          type="button"
          className={BOTON_SECUNDARIO}
          disabled={ocupado || motivo.trim().length < 3}
          onClick={() => void correr(() => onRechazar(motivo.trim()))}
        >
          Rechazar
        </button>
      </div>
    </article>
  )
}
