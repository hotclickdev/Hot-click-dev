import { useTranslation } from 'react-i18next'
import FilaProducto, { TarjetaProducto } from './ProductosTableFila'
import ProductosVacio from './ProductosTableEmpty'
import PaginacionProductos from './ProductosTableToolbar'

export default function ProductosTable({
  filtered,
  products,
  totalProds,
  prodPage,
  isAdmin,
  carruselSlots,
  search,
  hasFilters,
  onToggleDestacado,
  onToggleCarrusel,
  onEdit,
  onKardex,
  onDelete,
  onOferta,
  onOcultar,
  onClearFilters,
  onNuevo,
  onPage,
  vistaSimple,
}) {
  const { t } = useTranslation()
  const encabezados = encabezadosProductos(t, isAdmin, vistaSimple)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
              {encabezados.map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <FilaProducto
                key={p.id}
                producto={p}
                isAdmin={isAdmin}
                carruselSlots={carruselSlots}
                t={t}
                onToggleDestacado={onToggleDestacado}
                onToggleCarrusel={onToggleCarrusel}
                onEdit={onEdit}
                onKardex={onKardex}
                onDelete={onDelete}
                onOferta={onOferta}
                onOcultar={onOcultar}
                vistaSimple={vistaSimple}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y" style={{ borderColor: 'var(--hc-border)' }}>
        {filtered.map((p) => (
          <TarjetaProducto
            key={p.id}
            producto={p}
            t={t}
            onEdit={onEdit}
            onKardex={onKardex}
            onDelete={onDelete}
            onOferta={onOferta}
            onOcultar={onOcultar}
            vistaSimple={vistaSimple}
          />
        ))}
      </div>

      <div>
        {filtered.length === 0 && (
          <ProductosVacio
            search={search}
            hasFilters={hasFilters}
            onClearFilters={onClearFilters}
            onNuevo={onNuevo}
          />
        )}
      </div>
      <PaginacionProductos
        prodPage={prodPage}
        productsLength={products.length}
        totalProds={totalProds}
        onPage={onPage}
      />
    </div>
  )
}

function encabezadosProductos(t, isAdmin, vistaSimple) {
  return [
    ...(isAdmin ? ['★', 'Pos.'] : []),
    ...(vistaSimple ? [] : ['ID']),
    t('admin.products.name'),
    t('admin.products.price'),
    t('admin.products.stock'),
    vistaSimple ? 'Movimiento' : 'SKU / Barcode',
    t('admin.products.category'),
    ...(isAdmin ? ['SEO'] : []),
    t('admin.products.actions'),
  ]
}
