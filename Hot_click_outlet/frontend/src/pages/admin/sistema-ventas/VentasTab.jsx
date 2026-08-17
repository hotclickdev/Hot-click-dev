import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { posService } from '@/services/posService'
import { formatDate, formatPrice } from '@/utils/format'
import {
  PERIODOS_VENTAS,
  CARD_SHADOW,
  dentroDelPeriodo,
  estiloPildora,
  nombresArticulosVenta,
} from './ventasPedidosHelpers'

export default function VentasTab() {
  const { showToast } = useToast()
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('hoy')

  useEffect(() => {
    posService.historial()
      .then(res => setVentas(res?.data ?? []))
      .catch((err) => {
        console.error('[VentasTab] historial', err)
        showToast('Error al cargar las ventas', 'error')
        setVentas([])
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único, mismo orden que posService.historial()
  }, [])

  const filtradas = useMemo(
    () => ventas.filter(v => dentroDelPeriodo(v.fechaPedido, periodo))
      .sort((a, b) => new Date(b.fechaPedido) - new Date(a.fechaPedido)),
    [ventas, periodo]
  )

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap">
        {PERIODOS_VENTAS.map(p => (
          <button type="button" key={p.key} onClick={() => setPeriodo(p.key)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={estiloPildora(periodo === p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? <VacioVentas /> : <TablaVentas ventas={filtradas} />}
    </>
  )
}

function VacioVentas() {
  return (
    <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
      <p style={{ color: 'var(--hc-muted)' }}>Sin ventas en este período.</p>
      <Link to="/admin/pos" className="text-sm font-semibold mt-2 inline-block" style={{ color: 'var(--hc-accent)' }}>Abrí la caja (POS) →</Link>
    </div>
  )
}

function TablaVentas({ ventas }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
              {['Venta', 'Hora', 'Artículos', 'Pago', 'Total'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ventas.map(v => (
              <tr key={v.id} className="transition-colors hover:bg-[var(--hc-surface-2)]" style={{ borderTop: '1px solid var(--hc-border)' }}>
                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--hc-text)' }}>{v.numeroPedido ?? `#${v.id}`}</td>
                <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>{formatDate(v.fechaPedido)}</td>
                <td className="px-4 py-3" style={{ color: 'var(--hc-text)' }}>{nombresArticulosVenta(v)}</td>
                <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>{v.metodoPago ?? '—'}</td>
                <td className="px-4 py-3 font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>{formatPrice(v.totalPedido)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
