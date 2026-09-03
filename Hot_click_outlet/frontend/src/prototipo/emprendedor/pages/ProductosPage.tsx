import { useMemo, useState } from 'react'
import BotonesAgregarProducto from '@/prototipo/compartido/BotonesAgregarProducto'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import EstadoVacioConversacional from '@/prototipo/compartido/motion/EstadoVacioConversacional'
import { ItemListaStagger, ListaStagger } from '@/prototipo/compartido/motion/ListaStagger'
import SkeletonLista from '@/prototipo/compartido/motion/SkeletonLista'
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
  const baseNuevo = `${RUTA_EMPRENDEDOR}/productos/nuevo`

  return (
    <main className="flex flex-col gap-6 px-5 py-8 md:max-w-[760px] md:gap-6 md:px-16 md:py-12">
      <EntradaPagina className="flex flex-col gap-6">
        <header>
          <h1 className="font-display text-[22px] font-bold md:text-[28px]">Mis Productos</h1>
          <p className="text-xs text-hc-muted md:hidden">Outlet · {usuario}</p>
        </header>

        {vacio ? (
          <div data-mm="seller-lista-productos">
            <EstadoVacioConversacional
              titulo="Todavía no subiste productos"
              mensaje="Agregá tu primer producto para empezar a vender"
              accion={<BotonesAgregarProducto baseNuevo={baseNuevo} />}
            />
          </div>
        ) : (
          <BotonesAgregarProducto baseNuevo={baseNuevo} />
        )}

        {!vacio ? <FilaChips valor={filtro} opciones={FILTROS} onChange={setFiltro} /> : null}

        {cargando ? <SkeletonLista filas={4} /> : null}
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
        {!cargando && productos.length > 0 && visibles.length === 0 ? (
          <p className="text-sm text-hc-muted">No hay productos en este filtro.</p>
        ) : null}
        {visibles.length > 0 ? <ListadoGrupos productos={visibles} filtro={filtro} /> : null}
      </EntradaPagina>
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
          <ListaStagger className="flex flex-col gap-4">
            {grupo.items.map((producto) => (
              <ItemListaStagger key={producto.id}>
                <FilaProducto producto={producto} />
              </ItemListaStagger>
            ))}
          </ListaStagger>
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
