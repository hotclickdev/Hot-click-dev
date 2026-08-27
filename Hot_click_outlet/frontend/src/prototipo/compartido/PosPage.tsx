import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { PRODUCTOS, type CategoriaProducto, type ProductoMock } from './mock'
import { resumenTicket } from './posTicket'
import { Chip, EncabezadoPagina, Miniatura } from './ui'
import { useSellerRuta } from './SellerPlanContext'

const INICIAL: Record<string, number> = { auriculares: 2, camiseta: 1 }

/**
 * Caja POS (Figma 73:254).
 */
export default function PosPage() {
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState<'Todos' | CategoriaProducto>('Todos')
  const [cantidades, setCantidades] = useState<Record<string, number>>(INICIAL)
  const visibles = filtro === 'Todos' ? PRODUCTOS : PRODUCTOS.filter((item) => item.categoria === filtro)
  const { items, total } = useMemo(() => resumenTicket(cantidades), [cantidades])

  return (
    <main className="px-5 pb-28 pt-[60px]">
      <EncabezadoPagina titulo="Caja (POS)" subtitulo="Registrá una venta en persona" volverA={ruta()} />
      <div className="mb-3 flex min-h-11 items-center rounded-xl bg-hc-surface-2 px-3.5 text-sm text-hc-muted">
        Buscar producto o escanear código
      </div>
      <div className="mb-4 flex gap-2">
        {(['Todos', 'Tecnología', 'Ropa'] as const).map((item) => (
          <Chip key={item} activo={filtro === item} onClick={() => setFiltro(item)}>{item}</Chip>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {visibles.map((item) => (
          <li key={item.id}>
            <TarjetaPos
              producto={item}
              qty={cantidades[item.id] ?? 0}
              onAdd={() => setCantidades((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))}
            />
          </li>
        ))}
      </ul>
      <div className="fixed bottom-4 left-0 right-0 mx-auto max-w-md px-5">
        <div className="flex items-center justify-between rounded-2xl bg-hc-text p-4 text-white">
          <div>
            <p className="text-[11px] text-white/70">{items} productos en el ticket</p>
            <p className="text-lg font-bold">{formatoColon(total)}</p>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-xl bg-hc-primary px-5 text-sm font-bold"
            onClick={() => navigate(ruta('pos/cobrar'), { state: { cantidades } })}
          >
            Cobrar
          </button>
        </div>
      </div>
    </main>
  )
}

function TarjetaPos({ producto, qty, onAdd }: { producto: ProductoMock; qty: number; onAdd: () => void }) {
  const seleccionado = qty > 0
  return (
    <article className={`rounded-2xl p-2.5 ${seleccionado ? 'border-[1.5px] border-hc-primary' : 'border border-hc-border'}`}>
      <div className="relative">
        <Miniatura className="h-24 w-full" />
        {qty ? (
          <span className="absolute right-1.5 top-1.5 flex size-[26px] items-center justify-center rounded-full bg-hc-primary text-xs font-bold text-white">
            {qty}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs font-medium">{producto.nombre}</p>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs font-bold text-hc-primary">{formatoColon(producto.precio)}</span>
        <button
          type="button"
          onClick={onAdd}
          className={`flex size-[26px] items-center justify-center rounded-full text-sm font-bold ${
            seleccionado ? 'text-[color:var(--hc-success)]' : 'bg-hc-text text-white'
          }`}
          style={seleccionado ? { background: 'var(--hc-success-bg)' } : undefined}
          aria-label={`Agregar ${producto.nombre}`}
        >
          +
        </button>
      </div>
    </article>
  )
}
