import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import CabeceraAtras from '../ui/CabeceraAtras'
import { Boton, Chip } from '@/prototipo/compartido/ui'
import { RUTA_EMPRENDEDOR } from '../constants'
import { leerTicket, totalTicket } from '../ticketPos'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import { ItemListaStagger, ListaStagger } from '@/prototipo/compartido/motion/ListaStagger'

const METODOS = ['Efectivo', 'SINPE', 'Tarjeta'] as const

/**
 * Cobrar POS (Figma 71:179).
 */
export default function CobrarPage() {
  const navigate = useNavigate()
  const [metodo, setMetodo] = useState<string>('Efectivo')
  const ticket = leerTicket()
  const total = totalTicket(ticket)

  return (
    <main className="flex flex-col gap-5 px-5 pb-10 pt-8">
      <EntradaPagina className="flex flex-col gap-5">
      <CabeceraAtras titulo="Cobrar" to={`${RUTA_EMPRENDEDOR}/pos`} />
      <ListaStagger className="flex flex-col gap-2">
      {ticket.map((linea) => (
        <ItemListaStagger key={linea.id}>
        <div className="flex justify-between text-[13px]">
          <span>
            {linea.nombre}  x{linea.cantidad}
          </span>
          <span className="font-medium">{formatoColon(linea.precio * linea.cantidad)}</span>
        </div>
        </ItemListaStagger>
      ))}
      </ListaStagger>
      <hr className="border-hc-border" />
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-bold">Total a cobrar</span>
        <span className="text-xl font-bold text-hc-primary">{formatoColon(total)}</span>
      </div>
      <p className="text-xs font-medium text-hc-muted">Método de pago</p>
      <div className="flex gap-2">
        {METODOS.map((opcion) => (
          <Chip key={opcion} activo={metodo === opcion} onClick={() => setMetodo(opcion)}>
            {opcion}
          </Chip>
        ))}
      </div>
      <Boton onClick={confirmar}>Confirmar cobro</Boton>
      </EntradaPagina>
    </main>
  )

  function confirmar() {
    if (metodo === 'Tarjeta') {
      navigate(`${RUTA_EMPRENDEDOR}/pos/qr`)
      return
    }
    navigate(`${RUTA_EMPRENDEDOR}/pos/venta`)
  }
}
