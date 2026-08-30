import { useEffect, useState } from 'react'
import { formatoColon } from '@/theme/formatoColon'
import EnlacePrimario from '../ui/EnlacePrimario'
import IconoExito from '../ui/IconoExito'
import { restaurarTicketDemo, totalTicket, vaciarTicket } from '../ticketPos'

/**
 * Venta registrada (Figma 71:204).
 */
export default function VentaRegistradaPage() {
  const [total] = useState(() => totalTicket() || 46900)

  useEffect(() => {
    vaciarTicket()
    restaurarTicketDemo()
  }, [])

  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 px-5 pb-16 pt-36 text-center">
      <IconoExito />
      <h1 className="font-display text-[19px] font-bold">Venta registrada</h1>
      <p className="text-[13px] text-hc-muted">
        Cobraste {formatoColon(total)} en efectivo. El ticket ya se descontó de tu inventario.
      </p>
      <EnlacePrimario to="/pos">Nueva venta</EnlacePrimario>
      <EnlacePrimario to="/reportes" variante="texto">
        Ver en Reportes
      </EnlacePrimario>
    </main>
  )
}
