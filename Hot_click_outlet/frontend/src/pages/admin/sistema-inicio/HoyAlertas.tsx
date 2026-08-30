import { Link } from 'react-router-dom'

const CARD_SHADOW = '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)'

type TonoAlerta = 'urgente' | 'alerta' | 'suave'

/**
 * Bloque “Hoy”: qué atender ahora, con las mismas alertas que Consultas con Hot.
 */
export default function HoyAlertas({ porDespachar, sinStock, sinVenta }: {
  porDespachar: number
  sinStock: number
  sinVenta: number
}) {
  return (
    <section className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>Hoy</h2>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Qué atender ahora, no cómo iba ayer.</p>
        </div>
        <Link to="/admin/copilot"
          className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}>
          Preguntale a Hot
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AlertaHoy to="/admin/pedidos" cuenta={porDespachar} etiqueta="pedidos por despachar" tono="urgente" />
        <AlertaHoy to="/admin/productos" cuenta={sinStock} etiqueta="sin stock o al mínimo" tono="alerta" />
        <AlertaHoy to="/admin/ofertas" cuenta={sinVenta} etiqueta="sin venta reciente" tono="suave" />
      </div>
    </section>
  )
}

function AlertaHoy({ to, cuenta, etiqueta, tono }: {
  to: string
  cuenta: number
  etiqueta: string
  tono: TonoAlerta
}) {
  const estilo = estiloTono(tono, cuenta)
  return (
    <Link to={to} className="rounded-xl p-4 flex flex-col gap-1 transition-opacity hover:opacity-90"
      style={{ backgroundColor: estilo.bg, border: `1px solid ${estilo.border}` }}>
      <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: estilo.color, fontVariantNumeric: 'tabular-nums' }}>
        {cuenta}
      </span>
      <span className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>{etiqueta}</span>
    </Link>
  )
}

function estiloTono(tono: TonoAlerta, cuenta: number) {
  if (cuenta <= 0) {
    return { bg: 'var(--hc-surface-2)', border: 'var(--hc-border)', color: 'var(--hc-muted)' }
  }
  if (tono === 'urgente') {
    return { bg: 'rgba(23,71,168,0.08)', border: 'rgba(23,71,168,0.25)', color: 'var(--hc-accent)' }
  }
  if (tono === 'alerta') {
    return { bg: '#f7ead2', border: 'rgba(138,90,0,0.3)', color: '#8a5a00' }
  }
  return { bg: 'var(--hc-surface-2)', border: 'var(--hc-border)', color: 'var(--hc-text)' }
}
