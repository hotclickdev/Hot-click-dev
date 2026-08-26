import { Link } from 'react-router-dom'
import { CARD_SHADOW, textoStockAlerta } from './sistemaReportesHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function TabAlertas({ stockRiesgo }) {
  if (stockRiesgo.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
        <p className="font-medium" style={{ color: '#1E7F4F' }}>¡Todo el inventario está en niveles seguros!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {stockRiesgo.map(p => {
        const actual = p.stockActual ?? p.stock ?? 0
        return (
          <div key={p.id} className="rounded-2xl flex items-center gap-4" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW, padding: '18px 20px' }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: actual <= 0 ? '#a8291f' : '#8a5a00' }} />
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--hc-text)' }}>{p.nombreProducto ?? p.nombre}</p>
              <p style={{ fontSize: 13, color: 'var(--hc-muted)' }}>
                {textoStockAlerta(actual)}
              </p>
            </div>
            <Link to="/admin/productos" className="text-sm font-semibold shrink-0" style={{ color: 'var(--hc-accent)' }}>
              <TextoFlecha>Reponé</TextoFlecha>
            </Link>
          </div>
        )
      })}
    </div>
  )
}
