import { Link } from 'react-router-dom'
import { formatPrice } from '@/utils/format'
import { EyeIcon, EyeOffIcon, PackageIcon, PencilIcon } from './empresasIcons'
import {
  esProductoVisibleEnCatalogo,
  etiquetaPublicacionProducto,
  filtrarProductosTab,
  rutaCargaMasivaEmpresa,
  rutaEnlacePdfEmpresa,
  rutaImportarEmpresa,
  type EmpresaProductoTab,
} from './empresasHelpers'
import TabEmpty from './TabEmpty'
import TabLoader from './TabLoader'
import type { Id } from '@/types/api'

function ProductoCard({
  producto,
  saving,
  onEditar,
  onToggleVisibilidad,
}: {
  producto: EmpresaProductoTab
  saving: boolean
  onEditar: (producto: EmpresaProductoTab) => void
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
          visible={visible}
          saving={saving}
          onEditar={() => onEditar(producto)}
          onToggle={() => onToggleVisibilidad(producto)}
        />
      </div>
    </div>
  )
}

function AccionesProductoCard({
  visible,
  saving,
  onEditar,
  onToggle,
}: {
  visible: boolean
  saving: boolean
  onEditar: () => void
  onToggle: () => void
}) {
  const btn = 'flex-1 inline-flex items-center justify-center gap-1 min-h-11 px-2 rounded-lg text-[11px] font-semibold'
  return (
    <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
      <button
        type="button"
        onClick={onEditar}
        className={btn}
        style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-accent)', border: '1px solid var(--hc-border)' }}
      >
        <PencilIcon />
        Editar
      </button>
      <button
        type="button"
        onClick={onToggle}
        disabled={saving}
        className={`${btn} disabled:opacity-50`}
        style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
      >
        {visible ? <><EyeOffIcon className="w-3.5 h-3.5" /> Pausar</> : <><EyeIcon className="w-3.5 h-3.5" /> Publicar</>}
      </button>
    </div>
  )
}

export function TabProductosToolbar({
  empresaId,
  busqueda,
  onBusqueda,
  onNuevo,
}: {
  empresaId: Id
  busqueda: string
  onBusqueda: (valor: string) => void
  onNuevo: () => void
}) {
  const linkCls = 'inline-flex items-center justify-center min-h-11 px-3 rounded-xl text-xs font-semibold'
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Link
          to={rutaCargaMasivaEmpresa(empresaId)}
          className={linkCls}
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          Carga masiva
        </Link>
        <Link
          to={rutaEnlacePdfEmpresa(empresaId)}
          className={linkCls}
          style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
        >
          Enlace o PDF
        </Link>
        <Link
          to={rutaImportarEmpresa(empresaId, 'csv')}
          className={linkCls}
          style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
        >
          Importar CSV
        </Link>
        <button
          type="button"
          onClick={onNuevo}
          className={linkCls}
          style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
        >
          Nuevo producto
        </button>
      </div>
      <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>
        Buscar producto
        <input
          type="search"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          placeholder="Nombre o categoría"
          className="mt-1 min-h-11 w-full rounded-xl px-3 text-sm"
          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
        />
      </label>
    </div>
  )
}

export default function TabProductos({
  loading,
  productos,
  savingId,
  busqueda,
  onEditar,
  onToggleVisibilidad,
}: {
  loading: boolean
  productos: EmpresaProductoTab[] | null
  savingId: Id | null
  busqueda: string
  onEditar: (producto: EmpresaProductoTab) => void
  onToggleVisibilidad: (producto: EmpresaProductoTab) => void
}) {
  if (loading) return <TabLoader />
  const lista = filtrarProductosTab(productos ?? [], busqueda)
  if (!productos || productos.length === 0) {
    return <TabEmpty text="Este negocio todavía no tiene productos. Cargá un CSV o creá el primero." />
  }
  if (lista.length === 0) {
    return <TabEmpty text="Ningún producto coincide con la búsqueda." />
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {lista.map((p) => (
        <ProductoCard
          key={p.id}
          producto={p}
          saving={savingId === p.id}
          onEditar={onEditar}
          onToggleVisibilidad={onToggleVisibilidad}
        />
      ))}
    </div>
  )
}
