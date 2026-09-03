import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { type CategoriaProducto, type ProductoMock } from './mock'
import { Chip, EncabezadoPagina, Miniatura } from './ui'
import BotonesAgregarProducto from './BotonesAgregarProducto'
import EntradaPagina from './motion/EntradaPagina'
import EstadoVacioConversacional from './motion/EstadoVacioConversacional'
import { ItemListaStagger, ListaStagger } from './motion/ListaStagger'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'
import { useCatalogoVendedor } from './useCatalogoVendedor'

type Filtro = 'Todos' | 'Recién agregados' | CategoriaProducto

/**
 * Listado Mis Productos (Figma 61:142).
 */
export default function ProductosPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const { seller, cargando, error } = useCatalogoVendedor()
  const [filtro, setFiltro] = useState<Filtro>('Todos')
  const visibles = filtrarProductos(seller, filtro)
  const vacio = !cargando && seller.length === 0
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EntradaPagina>
        <EncabezadoPagina titulo="Mis Productos" subtitulo={`Outlet · ${plan.usuario}`} />
        <BotonesAgregarProducto baseNuevo={ruta('productos/nuevo')} />
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {(['Todos', 'Recién agregados', 'Tecnología', 'Ropa'] as const).map((item) => (
            <Chip key={item} activo={filtro === item} onClick={() => setFiltro(item)}>{item}</Chip>
          ))}
        </div>
        {cargando ? <p className="mt-6 text-sm text-hc-muted">Cargando catálogo…</p> : null}
        {error ? <p className="mt-6 text-sm text-hc-danger">{error}</p> : null}
        <div data-mm="seller-lista-productos">
          {vacio ? (
            <EstadoVacioConversacional
              titulo="Todavía no subiste productos"
              mensaje="Usá los botones de arriba para publicar catálogo o personalizado."
            />
          ) : (
            <SeccionesProductos filtro={filtro} productos={visibles} ruta={ruta} />
          )}
        </div>
      </EntradaPagina>
    </main>
  )
}

function filtrarProductos(productos: ProductoMock[], filtro: Filtro): ProductoMock[] {
  if (filtro === 'Todos') return productos
  if (filtro === 'Recién agregados') return productos.filter((item) => item.reciente)
  return productos.filter((item) => item.categoria === filtro)
}

function SeccionesProductos({
  filtro,
  productos,
  ruta,
}: {
  filtro: Filtro
  productos: ProductoMock[]
  ruta: (s?: string) => string
}) {
  if (filtro === 'Recién agregados') {
    return (
      <div className="mt-6">
        <Grupo titulo="Recién agregados" items={productos} ruta={ruta} />
      </div>
    )
  }
  if (filtro !== 'Todos') {
    return (
      <div className="mt-6">
        <Grupo titulo={filtro} items={productos} ruta={ruta} />
      </div>
    )
  }
  return (
    <div className="mt-6 space-y-5">
      <Grupo titulo="Recién agregados" items={productos.filter((item) => item.reciente)} ruta={ruta} />
      <Grupo titulo="Tecnología" items={productos.filter((item) => item.categoria === 'Tecnología')} ruta={ruta} />
      <Grupo titulo="Ropa" items={productos.filter((item) => item.categoria === 'Ropa')} ruta={ruta} />
    </div>
  )
}

function Grupo({ titulo, items, ruta }: { titulo: string; items: ProductoMock[]; ruta: (s?: string) => string }) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 text-[15px] font-bold">{titulo}</h2>
      <ListaStagger className="space-y-4">
        {items.map((item) => (
          <ItemListaStagger key={item.id}>
            <Link to={ruta(`productos/${item.id}/editar`)} className="flex items-center gap-3">
              <Miniatura />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.nombre}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Tag categoria={item.categoria} />
                  <span className="text-[13px] font-bold">{formatoColon(item.precio)}</span>
                  <EstadoBadge estado={item.estado} />
                </div>
              </div>
            </Link>
          </ItemListaStagger>
        ))}
      </ListaStagger>
    </section>
  )
}

function Tag({ categoria }: { categoria: string }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-[9px] font-medium" style={{ background: 'var(--hc-red-50)', color: 'var(--hc-primary)' }}>
      {categoria}
    </span>
  )
}

function EstadoBadge({ estado }: { estado: ProductoMock['estado'] }) {
  const publicado = estado === 'Publicado'
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-medium"
      style={{
        background: publicado ? 'var(--hc-success-bg)' : 'var(--hc-warning-bg)',
        color: publicado ? 'var(--hc-success)' : 'var(--hc-warning)',
      }}
    >
      {estado}
    </span>
  )
}
