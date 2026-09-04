import { Link } from 'react-router-dom'
import { formatPrice } from '@/utils/format'
import BotonesAgregarProducto from '@/prototipo/compartido/BotonesAgregarProducto'
import { rutaNuevoProductoSeller } from '@/prototipo/compartido/rutaNuevoProductoSeller'
import useTenantStore from '@/store/tenantStore'
import { CARD_SHADOW, PAGE_SIZE, STOCK_BAJO_MAX, codigoProducto, estaAgotado, estiloChip, estiloEstado, textoStock } from './sistemaProductosHelpers'
import type { SistemaProductosPage } from './useSistemaProductos'
import type { CategoriaAdmin } from '../productos/productosHelpers'
import type { Producto } from '@/types/producto'
import TextoFlecha from '@/components/ui/TextoFlecha'
import CuotaBar from '@/components/ui/CuotaBar'

const CHIPS: [string, string][] = [
  ['todos', 'Todos'],
  ['activos', 'Activos'],
  ['agotados', 'Agotados'],
]

/**
 * Filtros, tabla y vacío de Productos Sistema (mockup EPN).
 */
export default function SistemaProductosListado({
  products,
  total,
  totalCatalogo,
  page,
  setPage,
  search,
  onSearch,
  filtro,
  onFiltro,
  categoriaId,
  onCategoria,
  categories,
}: SistemaProductosPage) {
  if (totalCatalogo === 0) return <VacioSinProductos />

  return (
    <>
      <CuotaProductos />
      <FiltrosBar
        search={search}
        onSearch={onSearch}
        filtro={filtro}
        onFiltro={onFiltro}
        categoriaId={categoriaId}
        onCategoria={onCategoria}
        categories={categories}
      />
      {total === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: 'var(--hc-muted)' }}>
          No hay productos con esos filtros.
        </p>
      ) : (
        <>
          <TablaProductos products={products} />
          <TarjetasMovil products={products} />
          <Paginacion total={total} page={page} onPage={setPage} />
        </>
      )}
    </>
  )
}

function CuotaProductos() {
  const usoProductos = useTenantStore((s) => s.usoProductos)
  const maxProductos = useTenantStore((s) => s.maxProductos)
  return (
    <div className="mb-4">
      <CuotaBar uso={usoProductos} max={maxProductos} etiqueta="productos" />
    </div>
  )
}

function FiltrosBar({ search, onSearch, filtro, onFiltro, categoriaId, onCategoria, categories }: {
  search: string
  onSearch: (valor: string) => void
  filtro: string
  onFiltro: (valor: string) => void
  categoriaId: string
  onCategoria: (valor: string) => void
  categories: CategoriaAdmin[]
}) {
  return (
    <section className="flex gap-3 items-center mb-4 flex-wrap">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Buscá por nombre o código…"
        className="flex-1 min-w-[240px] max-w-[380px] px-3.5 py-3 rounded-[10px] text-[15px] focus:outline-none"
        style={{ border: '1px solid #d8cfc0', backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }}
      />
      <div className="flex gap-2">
        {CHIPS.map(([val, lbl]) => (
          <button
            key={val}
            type="button"
            onClick={() => onFiltro(val)}
            className="px-4 py-2.5 rounded-[10px] text-sm"
            style={estiloChip(filtro === val)}
          >
            {lbl}
          </button>
        ))}
      </div>
      <select
        value={categoriaId}
        onChange={(e) => onCategoria(e.target.value)}
        className="px-3.5 py-2.5 rounded-[10px] text-sm focus:outline-none"
        style={{ border: '1px solid #d8cfc0', backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }}
      >
        <option value="">Todas las categorías</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.nombreCategoria ?? c.nombre}</option>
        ))}
      </select>
    </section>
  )
}

function TablaProductos({ products }: { products: Producto[] }) {
  return (
    <section className="rounded-2xl overflow-hidden hidden md:block" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
      <div
        className="grid gap-3 items-center px-6 py-3.5 text-xs font-bold uppercase tracking-wide"
        style={{ gridTemplateColumns: '110px 1fr 150px 120px 100px 110px 90px', borderBottom: '1px solid #f0e9dd', color: '#8a8378' }}
      >
        <div>Código</div>
        <div>Producto</div>
        <div>Categoría</div>
        <div>Precio</div>
        <div>Stock</div>
        <div>Estado</div>
        <div className="text-right">Acciones</div>
      </div>
      {products.map((p) => <Fila key={p.id} producto={p} />)}
    </section>
  )
}

function Fila({ producto }: { producto: Producto }) {
  const agotado = estaAgotado(producto)
  return (
    <div
      className="grid gap-3 items-center px-6 py-3.5 hover:bg-[#faf6ef]"
      style={{ gridTemplateColumns: '110px 1fr 150px 120px 100px 110px 90px', borderBottom: '1px solid #f0e9dd' }}
    >
      <div className="text-[13px] font-mono" style={{ color: '#8a8378' }}>{codigoProducto(producto)}</div>
      <div className="flex items-center gap-3 min-w-0">
        <MiniFoto producto={producto} />
        <span className="text-[15px] font-semibold truncate" style={{ color: 'var(--hc-text)' }}>{producto.nombre}</span>
      </div>
      <div className="text-sm" style={{ color: '#6b6459' }}>{producto.categoriaNombre || '—'}</div>
      <div className="font-bold text-[15px]" style={{ fontFamily: 'var(--font-display)' }}>{formatPrice(producto.precio)}</div>
      <div className="text-sm" style={{ color: agotado ? '#8a8378' : (Number(producto.stock) <= STOCK_BAJO_MAX ? '#8a5a00' : 'var(--hc-text)'), fontWeight: Number(producto.stock) <= STOCK_BAJO_MAX && !agotado ? 700 : 400 }}>
        {textoStock(producto.stock)}
      </div>
      <div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={estiloEstado(agotado)}>
          {agotado ? 'Agotado' : 'Activo'}
        </span>
      </div>
      <div className="text-right">
        <Link to={`/admin/productos/${producto.id}/editar`} className="text-sm font-semibold" style={{ color: 'var(--hc-accent)' }}>
          Editá
        </Link>
      </div>
    </div>
  )
}

function TarjetasMovil({ products }: { products: Producto[] }) {
  return (
    <div className="md:hidden space-y-3">
      {products.map((p) => {
        const agotado = estaAgotado(p)
        return (
          <Link
            key={p.id}
            to={`/admin/productos/${p.id}/editar`}
            className="flex gap-3 p-4 rounded-2xl"
            style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}
          >
            <MiniFoto producto={p} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
              <p className="text-xs mt-0.5" style={{ color: '#8a8378' }}>{codigoProducto(p)} · {p.categoriaNombre || 'Sin categoría'}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>{formatPrice(p.precio)}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={estiloEstado(agotado)}>
                  {agotado ? 'Agotado' : textoStock(p.stock)}
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function MiniFoto({ producto }: { producto: Producto }) {
  if (producto.imagenUrl) {
    return <img src={producto.imagenUrl} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
  }
  return <div className="w-11 h-11 rounded-xl shrink-0" style={{ backgroundColor: 'var(--hc-surface-2)' }} />
}

function Paginacion({ total, page, onPage }: {
  total: number
  page: number
  onPage: (n: number | ((prev: number) => number)) => void
}) {
  const desde = page * PAGE_SIZE + 1
  const hasta = Math.min((page + 1) * PAGE_SIZE, total)
  const hayAnt = page > 0
  const haySig = hasta < total
  return (
    <section className="flex items-center justify-between mt-4">
      <div className="text-sm" style={{ color: '#6b6459' }}>Mostrando {desde}–{hasta} de {total}</div>
      <div className="flex gap-2">
        <button type="button" disabled={!hayAnt} onClick={() => onPage(page - 1)}
          className="px-[18px] py-2.5 rounded-[10px] text-sm font-semibold disabled:opacity-50"
          style={{ border: '1px solid #d8cfc0', backgroundColor: 'var(--hc-surface)', color: hayAnt ? 'var(--hc-accent)' : '#8a8378' }}>
          <TextoFlecha dir="atras">Anterior</TextoFlecha>
        </button>
        <button type="button" disabled={!haySig} onClick={() => onPage(page + 1)}
          className="px-[18px] py-2.5 rounded-[10px] text-sm font-semibold disabled:opacity-50"
          style={{ border: '1px solid #d8cfc0', backgroundColor: 'var(--hc-surface)', color: haySig ? 'var(--hc-accent)' : '#8a8378' }}>
          <TextoFlecha>Siguiente</TextoFlecha>
        </button>
      </div>
    </section>
  )
}

function VacioSinProductos() {
  const planNombre = useTenantStore((s) => s.planNombre)
  return (
    <section className="rounded-2xl px-8 py-16 flex flex-col items-center gap-3.5 text-center" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
      <div className="w-14 h-14 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }} />
      <p className="font-bold text-[19px]" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>Todavía no tenés productos</p>
      <p className="text-[15px] max-w-sm leading-relaxed" style={{ color: '#6b6459' }}>
        Agregá tu primer producto. Cuando tu negocio esté activo, los compradores lo ven en tu tienda.
      </p>
      <div className="mt-1 w-full max-w-sm">
        <BotonesAgregarProducto baseNuevo={rutaNuevoProductoSeller(planNombre)} />
      </div>
    </section>
  )
}
