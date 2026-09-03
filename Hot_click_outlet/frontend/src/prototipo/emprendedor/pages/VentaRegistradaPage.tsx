import { useEffect, useState } from 'react'
import { formatoColon } from '@/theme/formatoColon'
import EnlacePrimario from '../ui/EnlacePrimario'
import { restaurarTicketDemo, totalTicket, vaciarTicket } from '../ticketPos'
import PantallaExitoWizard from '@/prototipo/compartido/motion/PantallaExitoWizard'
import { RUTA_EMPRENDEDOR } from '../constants'

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
    <main className="flex min-h-dvh flex-col px-5 pb-16 pt-24">
      <PantallaExitoWizard
        titulo="Venta registrada"
        mensaje={`Cobraste ${formatoColon(total)} en efectivo. El ticket ya se descontó de tu inventario.`}
        accion={
          <div className="flex w-full max-w-sm flex-col gap-2">
            <EnlacePrimario to={`${RUTA_EMPRENDEDOR}/pos`}>Nueva venta</EnlacePrimario>
            <EnlacePrimario to={`${RUTA_EMPRENDEDOR}/reportes`} variante="texto">
              Ver en Reportes
            </EnlacePrimario>
          </div>
        }
      />
    </main>
  )
}
