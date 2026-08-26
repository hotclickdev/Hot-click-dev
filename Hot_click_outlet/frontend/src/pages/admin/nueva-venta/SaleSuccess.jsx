import Button from '@/components/ui/Button'
import { formatPrice } from '@/utils/format'
import SaleStepTracker from './SaleStepTracker'
import TextoFlecha from '@/components/ui/TextoFlecha'
import TextoMas from '@/components/ui/TextoMas'

/**
 * @param {{
 *   createdOrder: {
 *     estado: string
 *     esRetiro: boolean
 *     nombreCliente: string
 *     metodoPago: string
 *     items: object[]
 *     costoEnvio: number
 *     total: number
 *   }
 *   onNuevaVenta: () => void
 *   onVerPedidos: () => void
 * }} props
 */
export default function SaleSuccess({ createdOrder, onNuevaVenta, onVerPedidos }) {
  return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#e8e8ed]">Venta registrada</h2>
        <p className="text-sm text-[#8e8e9a]">{createdOrder.nombreCliente} · {createdOrder.metodoPago}</p>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl px-4 py-5 space-y-3">
        <p className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Estado del pedido</p>
        <SaleStepTracker estado={createdOrder.estado} esRetiro={createdOrder.esRetiro} />
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl px-4 py-4 space-y-2">
        <p className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Productos</p>
        {createdOrder.items.map((i) => (
          <div key={i.id} className="flex justify-between items-center text-sm">
            <span className="text-[#e8e8ed] truncate flex-1 mr-3">{i.nombre} <span className="text-[#8e8e9a]">×{i.cantidad}</span></span>
            <span className="text-[#e8e8ed] font-medium shrink-0">{formatPrice(i.precio * i.cantidad)}</span>
          </div>
        ))}
        <div className="border-t border-white/8 pt-2 mt-2 space-y-1">
          {createdOrder.costoEnvio > 0 && (
            <div className="flex justify-between text-sm text-[#8e8e9a]">
              <span>Envío</span>
              <span>{formatPrice(createdOrder.costoEnvio)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-[#e8e8ed]">
            <span>Total</span>
            <span className="text-lg">{formatPrice(createdOrder.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" size="lg" className="flex-1" onClick={onNuevaVenta}>
          <TextoMas>Nueva venta</TextoMas>
        </Button>
        <Button size="lg" className="flex-1" onClick={onVerPedidos}>
          <TextoFlecha>Ver pedidos</TextoFlecha>
        </Button>
      </div>
    </div>
  )
}
