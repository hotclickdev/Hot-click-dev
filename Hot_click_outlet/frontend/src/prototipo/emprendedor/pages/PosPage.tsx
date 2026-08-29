import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import CabeceraAtras from '../ui/CabeceraAtras'
import FilaChips from '../ui/FilaChips'
import Miniatura from '../ui/Miniatura'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import { agregarAlTicket, cantidadTicket, leerTicket, totalTicket } from '../ticketPos'
import type { LineaTicket, ProductoEmprendedor } from '../types'

const FILTROS = ['Todos', 'Tecnología', 'Ropa'] as const

/**
 * POS caja (Figma 71:128).
 */
export default function PosPage() {
  const navigate = useNavigate()
  const { productos } = useCatalogoEmprendedor()
  const [filtro, setFiltro] = useState<string>('Todos')
  const [ticket, setTicket] = useState<LineaTicket[]>(() => leerTicket())
  const visibles = useMemo(
    () => (filtro === 'Todos' ? productos : productos.filter((p) => p.categoria === filtro)),
    [productos, filtro],
  )

  return (
    <main className="flex flex-col gap-[18px] px-5 pb-28 pt-8">
      <div>
        <CabeceraAtras titulo="Caja (POS)" to={RUTA_EMPRENDEDOR} />
        <p className="text-xs text-hc-muted">Registrá una venta en persona</p>
      </div>
      <p className="rounded-xl bg-[var(--hc-n-50)] px-3.5 py-3 text-[13px] text-hc-muted">
        Buscar producto o escanear código
      </p>
      <FilaChips valor={filtro} opciones={FILTROS} onChange={setFiltro} />
      <div className="grid grid-cols-2 gap-3">
        {visibles.map((producto) => (
          <TarjetaPos
            key={producto.id}
            producto={producto}
            cantidad={ticket.find((l) => l.id === producto.id)?.cantidad ?? 0}
            onAgregar={() => setTicket(agregarAlTicket({ id: producto.id, nombre: producto.nombre, precio: producto.precio }))}
          />
        ))}
      </div>
      <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-md p-5">
        <div className="flex items-center justify-between rounded-2xl bg-hc-text p-4">
          <div>
            <p className="text-[11px] text-[var(--hc-n-400)]">{cantidadTicket(ticket)} productos en la factura</p>
            <p className="text-lg font-bold text-white">{formatoColon(totalTicket(ticket))}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`${RUTA_EMPRENDEDOR}/pos/cobrar`)}
            className="min-h-11 rounded-xl bg-hc-primary px-5 py-3 text-sm font-bold text-white"
          >
            Cobrar
          </button>
        </div>
      </div>
    </main>
  )
}

function TarjetaPos({
  producto,
  cantidad,
  onAgregar,
}: {
  producto: ProductoEmprendedor
  cantidad: number
  onAgregar: () => void
}) {
  const seleccionado = cantidad > 0
  return (
    <article className={`flex flex-col gap-1.5 rounded-2xl p-2.5 ${seleccionado ? 'border-[1.5px] border-hc-primary' : 'border border-hc-border'}`}>
      <div className="relative">
        <Miniatura src={producto.imagenUrl} alt="" size="lg" />
        {seleccionado ? (
          <span className="absolute right-1.5 top-1.5 flex size-[26px] items-center justify-center rounded-full bg-hc-primary text-xs font-bold text-white">
            {cantidad}
          </span>
        ) : null}
      </div>
      <p className="text-xs font-medium">{producto.nombre}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-hc-primary">{formatoColon(producto.precio)}</span>
        <button
          type="button"
          onClick={onAgregar}
          className={`flex size-[26px] items-center justify-center rounded-full text-sm font-bold ${
            seleccionado ? 'bg-[var(--hc-success-bg)] text-hc-success' : 'bg-hc-text text-white'
          }`}
          aria-label={`Agregar ${producto.nombre}`}
        >
          +
        </button>
      </div>
    </article>
  )
}
