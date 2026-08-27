import { useMemo, useState } from 'react'
import EnlacePrimario from '../ui/EnlacePrimario'
import FilaChips from '../ui/FilaChips'
import FilaProducto from '../ui/FilaProducto'
import { CUENTA_DEMO } from '../constants'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import type { ProductoEmprendedor } from '../types'

const FILTROS = ['Todos', 'Recién agregados', 'Tecnología', 'Ropa'] as const

/**
 * Paso 2 Mis Productos (Figma 7:2) + vacío 155:540.
 */
export default function ProductosPage() {
  const { productos } = useCatalogoEmprendedor()
  const [filtro, setFiltro] = useState<string>('Todos')
  const visibles = useMemo(() => filtrarProductos(productos, filtro), [productos, filtro])

  return (
    <main className="flex flex-col gap-6 px-5 py-8">
      <header>
        <h1 className="font-display text-[22px] font-bold">Mis Productos</h1>
        <p className="text-xs text-hc-muted">Outlet · {CUENTA_DEMO.usuario}</p>
      </header>
      <EnlacePrimario to="/productos/nuevo">+ Agregar producto</EnlacePrimario>
      <FilaChips valor={filtro} opciones={FILTROS} onChange={setFiltro} />
      {visibles.length === 0 ? <VacioProductos /> : <ListadoGrupos productos={visibles} filtro={filtro} />}
    </main>
  )
}

function filtrarProductos(productos: ProductoEmprendedor[], filtro: string) {
  if (filtro === 'Todos') return productos
  if (filtro === 'Recién agregados') return productos.filter((p) => p.recienAgregado)
  return productos.filter((p) => p.categoria === filtro)
}

function ListadoGrupos({ productos, filtro }: { productos: ProductoEmprendedor[]; filtro: string }) {
  const grupos = gruposVisibles(productos, filtro)
  return (
    <div className="flex flex-col gap-6">
      {grupos.map((grupo) => (
        <section key={grupo.titulo} className="flex flex-col gap-4">
          <h2 className="text-[15px] font-bold">{grupo.titulo}</h2>
          {grupo.items.map((producto) => (
            <FilaProducto key={producto.id} producto={producto} />
          ))}
        </section>
      ))}
    </div>
  )
}

function gruposVisibles(productos: ProductoEmprendedor[], filtro: string) {
  if (filtro !== 'Todos') return [{ titulo: filtro, items: productos }]
  return [
    { titulo: 'Recién agregados', items: productos.filter((p) => p.recienAgregado) },
    { titulo: 'Tecnología', items: productos.filter((p) => p.categoria === 'Tecnología' && !p.recienAgregado) },
    { titulo: 'Ropa', items: productos.filter((p) => p.categoria === 'Ropa' && !p.recienAgregado) },
  ].filter((grupo) => grupo.items.length > 0)
}

function VacioProductos() {
  return (
    <div className="flex flex-col items-center gap-3.5 py-16 text-center">
      <div className="flex size-[72px] items-center justify-center rounded-full bg-[var(--hc-n-100)] text-2xl font-bold text-hc-muted">
        —
      </div>
      <p className="text-[15px] font-bold">Todavía no subiste productos</p>
      <p className="text-xs text-hc-muted">Agregá tu primer producto para empezar a vender</p>
    </div>
  )
}
