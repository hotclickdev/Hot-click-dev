import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { Boton, Chip, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { resumenTicket } from './posTicket'

const DEFAULT: Record<string, number> = { auriculares: 2, camiseta: 1 }

/**
 * Cobrar ticket POS (Figma 73:305).
 */
export default function CobrarPage() {
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const location = useLocation()
  const cantidades = (location.state as { cantidades?: Record<string, number> } | null)?.cantidades ?? DEFAULT
  const { lineas, total } = resumenTicket(cantidades)
  const [metodo, setMetodo] = useState<'Efectivo' | 'SINPE' | 'Tarjeta'>('Efectivo')

  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Cobrar" volverA={ruta('pos')} />
      <ul className="space-y-3">
        {lineas.map((linea) => (
          <li key={linea.nombre} className="flex justify-between text-sm">
            <span>{linea.nombre} x{linea.qty}</span>
            <span>{formatoColon(linea.subtotal)}</span>
          </li>
        ))}
      </ul>
      <hr className="my-4 border-hc-border" />
      <div className="mb-6 flex justify-between text-lg font-bold">
        <span>Total a cobrar</span>
        <span>{formatoColon(total)}</span>
      </div>
      <p className="mb-2 text-xs font-medium text-hc-muted">Método de pago</p>
      <div className="mb-6 flex gap-2">
        {(['Efectivo', 'SINPE', 'Tarjeta'] as const).map((item) => (
          <Chip key={item} activo={metodo === item} onClick={() => setMetodo(item)}>{item}</Chip>
        ))}
      </div>
      <Boton
        onClick={() => navigate(metodo === 'Tarjeta' ? ruta('pos/qr') : ruta('pos/venta'), { state: { total, metodo } })}
      >
        Confirmar cobro
      </Boton>
    </main>
  )
}
