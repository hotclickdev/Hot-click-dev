import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import ChipFiltro from '../ui/ChipFiltro'
import { RUTA_EMPRENDEDOR } from '../constants'
import { posService } from '@/services/posService'
import { leerTicket, totalTicket } from '../ticketPos'

const METODOS = ['Efectivo', 'SINPE', 'Tarjeta'] as const

/**
 * Cobrar POS (Figma 71:179).
 */
export default function CobrarPage() {
  const navigate = useNavigate()
  const [metodo, setMetodo] = useState<string>('Efectivo')
  const [error, setError] = useState<string | null>(null)
  const ticket = leerTicket()
  const total = totalTicket(ticket)

  return (
    <main className="flex flex-col gap-5 px-5 pb-10 pt-8">
      <CabeceraAtras titulo="Cobrar" to={`${RUTA_EMPRENDEDOR}/pos`} />
      {ticket.map((linea) => (
        <div key={linea.id} className="flex justify-between text-[13px]">
          <span>
            {linea.nombre}  x{linea.cantidad}
          </span>
          <span className="font-medium">{formatoColon(linea.precio * linea.cantidad)}</span>
        </div>
      ))}
      <hr className="border-hc-border" />
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-bold">Total a cobrar</span>
        <span className="text-xl font-bold text-hc-primary">{formatoColon(total)}</span>
      </div>
      <p className="text-xs font-medium text-hc-muted">Método de pago</p>
      <div className="flex gap-2">
        {METODOS.map((opcion) => (
          <ChipFiltro key={opcion} activo={metodo === opcion} onClick={() => setMetodo(opcion)}>
            {opcion}
          </ChipFiltro>
        ))}
      </div>
      {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
      <BotonPrimario onClick={() => void confirmar()}>Confirmar cobro</BotonPrimario>
    </main>
  )

  async function confirmar() {
    if (metodo === 'Tarjeta') {
      navigate(`${RUTA_EMPRENDEDOR}/pos/qr`)
      return
    }
    try {
      await posService.crearVenta({
        items: ticket.map((linea) => ({ productoId: linea.id, cantidad: linea.cantidad })),
        metodoPago: metodo.toUpperCase(),
      })
    } catch (err) {
      console.error('[prototipo emprendedor] POS venta', err)
      setError('No se registró en el servidor. El prototipo continúa.')
    }
    navigate(`${RUTA_EMPRENDEDOR}/pos/venta`)
  }
}
