import { useMemo, useState } from 'react'
import BotonesAgregarProducto from '@/prototipo/compartido/BotonesAgregarProducto'
import { RUTA_EMPRENDEDOR } from '../constants'
import FilaChips from '../ui/FilaChips'
import FilaProducto from '../ui/FilaProducto'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import { useCuentaVendedor } from '../hooks/useCuentaVendedor'
import type { ProductoEmprendedor } from '../types'

const FILTROS = ['Todos', 'Recién agregados', 'Tecnología', 'Ropa'] as const

/**
 * Mis Productos — móvil + vacío desktop Figma 352:12136 / 155:540.
 */
export default function ProductosPage() {
  const { productos, cargando, error } = useCatalogoEmprendedor()
  const { usuario } = useCuentaVendedor()
  const [filtro, setFiltro] = useState<string>('Todos')
  const visibles = useMemo(() => filtrarProductos(productos, filtro), [productos, filtro])
  const vacio = !cargando && productos.length === 0

  return (
    <main className="flex flex-col gap-6 px-5 py-8 md:max-w-[760px] md:gap-6 md:px-16 md:py-12">
      <header>
        <h1 className="font-display text-[22px] font-bold md:text-[28px]">Mis Productos</h1>
        <p className="text-xs text-hc-muted md:hidden">Outlet · {usuario}</p>
      </header>

      <BotonesAgregarProducto baseNuevo={`${RUTA_EMPRENDEDOR}/productos/nuevo`} />

      {vacio ? <VacioProductos /> : null}

      {!vacio ? <FilaChips valor={filtro} opciones={FILTROS} onChange={setFiltro} /> : null}

      {cargando ? <p className="text-sm text-hc-muted">Cargando catálogo…</p> : null}
      {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
      {!cargando && productos.length > 0 && visibles.length === 0 ? (
        <p className="text-sm text-hc-muted">No hay productos en este filtro.</p>
      ) : null}
      {visibles.length > 0 ? <ListadoGrupos productos={visibles} filtro={filtro} /> : null}
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
    <div className="flex flex-col gap-6" data-mm="seller-lista-productos">
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
    <div
      className="flex flex-col items-center gap-4 rounded-xl border border-hc-border bg-hc-surface px-6 py-16 text-center md:px-6 md:py-16"
      data-mm="seller-lista-productos"
    >
      <p className="font-display text-[15px] font-bold md:text-lg">Todavía no subiste productos</p>
      <p className="text-xs text-hc-muted md:text-sm">Usá los botones de arriba para publicar catálogo o personalizado.</p>
    </div>
  )
}
