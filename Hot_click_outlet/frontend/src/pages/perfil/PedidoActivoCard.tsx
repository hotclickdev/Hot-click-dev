import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { estadoDePedido, ESTADO_LABELS, type PedidoCliente } from '../pedidos/pedidoHelpers'
import { primerProducto } from './perfilHelpers'
import { AccesoPedidos } from '@/components/comprador/estados/iconosAcceso'

/** Pedido en curso destacado arriba de "Mi cuenta" (Figma `28:1196`). */
export default function PedidoActivoCard({ pedido }: { pedido: PedidoCliente }) {
  const { t } = useTranslation()
  const estado = estadoDePedido(pedido)
  return (
    <Link
      to="/mis-pedidos"
      className="flex items-center gap-3 rounded-[14px] border border-hc-blue-100 bg-hc-blue-50 px-4 py-3.5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-hc-n-0 text-hc-blue-600">
        <AccesoPedidos />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-hc-blue-600">
          {t('perfil.pedidoEnCurso', 'Tu pedido en curso')}
        </span>
        <span className="block truncate text-[14px] font-medium text-hc-n-900">
          {pedido.numeroPedido ? `${pedido.numeroPedido} · ` : ''}{primerProducto(pedido)}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-hc-n-0 px-2.5 py-1 text-[12px] font-semibold text-hc-blue-600">
        {ESTADO_LABELS[estado] ?? estado}
      </span>
    </Link>
  )
}
