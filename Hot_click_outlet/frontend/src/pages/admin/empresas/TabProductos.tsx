import { formatPrice } from '@/utils/format'
import { PackageIcon } from './empresasIcons'
import TabEmpty from './TabEmpty'
import TabLoader from './TabLoader'
import type { EmpresaProductoTab } from './empresasHelpers'

function ProductoCard({ producto }: { producto: EmpresaProductoTab }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface-2)' }}>
      <div className="aspect-square bg-black/10 relative overflow-hidden">
        {producto.imagenUrl
          ? <img src={producto.imagenUrl} alt={producto.nombre} className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center"><PackageIcon /></div>
        }
        <div className="absolute top-1.5 right-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${producto.visibleCatalogo ? 'bg-green-500/80 text-white' : 'bg-gray-500/80 text-white'}`}>
            {producto.visibleCatalogo ? 'Visible' : 'Oculto'}
          </span>
        </div>
      </div>
      <div className="p-2">
        <p className="text-xs font-medium leading-tight truncate" style={{ color: 'var(--hc-text)' }}>{producto.nombre}</p>
        {producto.categoria && <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--hc-muted)' }}>{producto.categoria}</p>}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs font-bold" style={{ color: 'var(--hc-accent)' }}>{formatPrice(producto.precio)}</span>
          <span className="text-[10px]" style={{ color: producto.stock <= 0 ? '#f87171' : 'var(--hc-muted)' }}>
            {producto.stock <= 0 ? 'Sin stock' : `${producto.stock} uds`}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function TabProductos({ loading, productos }: { loading: boolean; productos: EmpresaProductoTab[] | null }) {
  if (loading) return <TabLoader />
  if (!productos || productos.length === 0) return <TabEmpty text="Sin productos aún" />
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {productos.map((p) => <ProductoCard key={p.id} producto={p} />)}
    </div>
  )
}
