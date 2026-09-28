import { useTranslation } from 'react-i18next'
import OrderCard from './OrderCard'
import { formatPrice, totalDePedido } from './pedidoHelpers'
import type { PedidoCliente } from './pedidoHelpers'

/**
 * Un pedido de checkout multivendedor: varios subpedidos (uno por tienda de
 * origen) bajo el mismo `grupoPago` y un único pago. Se ve como un bloque con
 * encabezado y cada paquete adentro, para no confundirlo con pedidos sueltos.
 *
 * Sin Figma propio todavía (el checkout agrupado vive en otra rama sin
 * fusionar) — este encabezado reusa los mismos tokens de `OrderCard` para no
 * introducir un estilo nuevo por adelantado.
 */
export default function PedidoGrupoCard({ pedidos }: { pedidos: PedidoCliente[] }) {
  const { t } = useTranslation()
  const totalGrupo = pedidos.reduce((acc, p) => acc + (totalDePedido(p) ?? 0), 0)

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--hc-border)' }}>
      <div className="flex items-center justify-between gap-3 px-5 py-3"
        style={{ backgroundColor: 'var(--hc-surface-2)', borderBottom: '1px solid var(--hc-border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>
          {t('orders.groupTitle', { count: pedidos.length })}
        </p>
        <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>{formatPrice(totalGrupo)}</p>
      </div>
      <div className="p-3 space-y-3" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
        {pedidos.map((pedido) => (
          <OrderCard key={pedido.id} order={pedido} />
        ))}
      </div>
    </div>
  )
}
