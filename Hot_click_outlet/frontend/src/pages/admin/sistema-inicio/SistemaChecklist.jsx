import { Link } from 'react-router-dom'
import { construirPasosChecklist } from './sistemaChecklistPasos'

/**
 * Checklist de arranque: producto, marca, publicar (si aplica) y plan.
 * @param {{
 *   onDismiss: () => void,
 *   totalProductos?: number|null,
 *   estadoEmpresa?: string|null,
 *   visibilidadPublica?: boolean|null,
 * }} props
 */
export default function SistemaChecklist({
  onDismiss,
  totalProductos,
  estadoEmpresa,
  visibilidadPublica,
}) {
  const pasos = construirPasosChecklist({ totalProductos, estadoEmpresa, visibilidadPublica })
  const pendientes = pasos.filter((p) => !p.hecho && !p.opcional).length

  return (
    <div
      data-testid="sistema-checklist"
      className="rounded-2xl p-5"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--hc-text)' }}>
            Empezá a vender
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--hc-muted)' }}>
            {textoAyuda(pendientes)}
          </p>
          <div className="flex flex-wrap gap-2">
            {pasos.map((paso, indice) => (
              <PasoLink key={paso.id} paso={paso} indice={indice} />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-2 rounded-lg shrink-0 min-h-11 min-w-11 flex items-center justify-center"
          style={{ color: 'var(--hc-muted)' }}
          aria-label="Cerrar checklist"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function textoAyuda(pendientes) {
  if (pendientes <= 0) return 'Marca y plan podés afinarlos cuando quieras.'
  if (pendientes === 1) return 'Te queda un paso clave para vender en HotClick.'
  return 'Producto, marca y publicar la tienda. El plan se ve en Sistema.'
}

function PasoLink({ paso, indice }) {
  if (paso.hecho) {
    return (
      <span
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium min-h-11"
        style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
      >
        <NumeroPaso hecho indice={indice} primario={false} />
        {paso.label}
      </span>
    )
  }

  return (
    <Link
      to={paso.to}
      className={paso.primario
        ? 'hc-btn hc-btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs font-medium min-h-11'
        : 'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium min-h-11'}
      style={paso.primario
        ? undefined
        : { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
    >
      <NumeroPaso hecho={false} indice={indice} primario={paso.primario} />
      {paso.label}
    </Link>
  )
}

function NumeroPaso({ hecho, indice, primario }) {
  const estilo = estiloNumero(hecho, primario)
  return (
    <span
      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
      style={estilo}
    >
      {hecho ? '✓' : indice + 1}
    </span>
  )
}

function estiloNumero(hecho, primario) {
  if (hecho) return { backgroundColor: 'rgba(30,127,79,0.15)', color: '#1E7F4F' }
  if (primario) return { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }
  return { backgroundColor: 'var(--hc-primary)', color: '#fff' }
}
