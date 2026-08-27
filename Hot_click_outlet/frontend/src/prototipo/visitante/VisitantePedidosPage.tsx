import VisitanteMain, { VisitanteBackHeader, VisitantePrecio } from './VisitantePiezas'
import { PEDIDOS_VISITANTE, visitanteRuta } from './visitanteMock'

/**
 * Mis pedidos Visitante (Figma 155:288).
 */
export default function VisitantePedidosPage() {
  return (
    <VisitanteMain conNav={false}>
      <VisitanteBackHeader titulo="Mis Pedidos" to={visitanteRuta('cuenta')} />
      <ul className="flex flex-col gap-4">
        {PEDIDOS_VISITANTE.map((pedido) => (
          <li key={pedido.id} className="rounded-[14px] border border-hc-border p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold">Pedido #{pedido.id}</p>
              <span
                className={`rounded-full px-2.5 py-1 text-[9px] font-medium ${
                  pedido.estado === 'Entregado'
                    ? 'bg-[var(--hc-success-bg)] text-hc-success'
                    : 'bg-[var(--hc-blue-50)] text-hc-accent'
                }`}
              >
                {pedido.estado}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-hc-muted">{pedido.negocio}</p>
            <p className="mt-1">
              <VisitantePrecio colones={pedido.total} />
            </p>
          </li>
        ))}
      </ul>
    </VisitanteMain>
  )
}
