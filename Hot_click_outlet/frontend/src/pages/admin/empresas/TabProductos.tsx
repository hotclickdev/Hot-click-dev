import { Link } from 'react-router-dom'
import { formatPrice } from '@/utils/format'
import { EyeIcon, EyeOffIcon, PackageIcon, PencilIcon } from './empresasIcons'
import { esProductoVisibleEnCatalogo, etiquetaPublicacionProducto, type EmpresaProductoTab } from './empresasHelpers'
import TabEmpty from './TabEmpty'
import TabLoader from './TabLoader'
import type { Id } from '@/types/api'

function ProductoCard({
  producto,
  saving,
  onToggleVisibilidad,
}: {
  producto: EmpresaProductoTab
  saving: boolean
  onToggleVisibilidad: (producto: EmpresaProductoTab) => void
}) {
  const visible = esProductoVisibleEnCatalogo(producto.visibleCatalogo)
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface-2)' }}>
      <div className="aspect-square bg-black/10 relative overflow-hidden">
        {producto.imagenUrl
          ? <img src={producto.imagenUrl} alt={producto.nombre} className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center"><PackageIcon /></div>
        }
        <div className="absolute top-1.5 right-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${visible ? 'bg-green-500/80 text-white' : 'bg-amber-500/80 text-white'}`}>
            {etiquetaPublicacionProducto(producto.visibleCatalogo)}
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
        <AccionesProductoCard
          productoId={producto.id}
          visible={visible}
          saving={saving}
          onToggle={() => onToggleVisibilidad(producto)}
        />
      </div>
    </div>
  )
}

function AccionesProductoCard({
  productoId,
  visible,
  saving,
  onToggle,
}: {
  productoId: Id
  visible: boolean
  saving: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
      <Link
        to={`/admin/productos/${productoId}/editar`}
        className="flex-1 inline-flex items-center justify-center gap-1 min-h-11 px-2 rounded-lg text-[11px] font-semibold"
        style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-accent)', border: '1px solid var(--hc-border)' }}
      >
        <PencilIcon />
        Editar
      </Link>
      <button
        type="button"
        onClick={onToggle}
        disabled={saving}
        className="flex-1 inline-flex items-center justify-center gap-1 min-h-11 px-2 rounded-lg text-[11px] font-semibold disabled:opacity-50"
        style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
      >
        {visible ? <><EyeOffIcon className="w-3.5 h-3.5" /> Pausar</> : <><EyeIcon className="w-3.5 h-3.5" /> Publicar</>}
      </button>
    </div>
  )
}

export default function TabProductos({
  loading,
  productos,
  savingId,
  onToggleVisibilidad,
}: {
  loading: boolean
  productos: EmpresaProductoTab[] | null
  savingId: Id | null
  onToggleVisibilidad: (producto: EmpresaProductoTab) => void
}) {
  if (loading) return <TabLoader />
  if (!productos || productos.length === 0) return <TabEmpty text="Sin productos aún" />
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {productos.map((p) => (
        <ProductoCard
          key={p.id}
          producto={p}
          saving={savingId === p.id}
          onToggleVisibilidad={onToggleVisibilidad}
        />
      ))}
    </div>
  )
}
