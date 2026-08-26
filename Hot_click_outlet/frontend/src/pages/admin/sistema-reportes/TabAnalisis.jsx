import { Link } from 'react-router-dom'
import { CARD_SHADOW, textoRecomendacionDia } from './sistemaReportesHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function TabAnalisis({ productosEstrella, totalSemana, mejorDia, mejorDiaPct }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="rounded-2xl p-5 flex flex-col gap-2.5" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>Productos estrella</h2>
        {productosEstrella.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Sin ventas suficientes esta semana todavía.</p>
        ) : (
          productosEstrella.map(p => (
            <div key={p.nombre} className="flex justify-between text-sm" style={{ color: 'var(--hc-text)' }}>
              <span>{p.nombre}</span>
              <span style={{ fontWeight: 700 }}>{p.pct}% de tus ventas</span>
            </div>
          ))
        )}
      </div>

      {totalSemana > 0 && (
        <div className="rounded-2xl p-5 flex items-start gap-3.5" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
          <div className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(23,71,168,0.08)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--hc-accent)' }}>H</div>
          <div className="flex flex-col gap-1">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--hc-text)' }}>Recomendación</div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--hc-text)' }}>
              {textoRecomendacionDia(mejorDiaPct, mejorDia.labelLargo)}
            </div>
          </div>
        </div>
      )}

      {productosEstrella.length > 0 && (
        <div className="rounded-2xl p-5 flex items-start gap-3.5" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
          <div className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(23,71,168,0.08)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--hc-accent)' }}>H</div>
          <div className="flex flex-col gap-1">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--hc-text)' }}>Recomendación</div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--hc-text)' }}>
              {`"${productosEstrella[0].nombre}" es tu producto más vendido — representa ${productosEstrella[0].pct}% de tus ingresos de la semana. Asegurate de no quedarte sin stock.`}
            </div>
          </div>
        </div>
      )}

      <Link to="/admin/copilot" className="text-sm font-semibold self-start" style={{ color: 'var(--hc-accent)' }}>
        <TextoFlecha>Consultale más a Hot</TextoFlecha>
      </Link>
    </div>
  )
}
