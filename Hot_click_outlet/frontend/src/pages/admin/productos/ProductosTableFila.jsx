import { motion } from 'framer-motion'
import Badge from '@/components/ui/Badge'
import { formatPrice, conditionLabel, conditionVariant } from '@/utils/format'
import SeoStatusIcon from './SeoStatusIcon'
import StarIcon from './StarIcon'
import { etiquetaMovimiento } from './productosHelpers'

function BoxIcon({ className }) {
  return (
    <svg className={className} style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    </svg>
  )
}

function varianteStock(stock) {
  if (stock === 0) return 'danger'
  if (stock <= 3) return 'warning'
  return 'success'
}

function ProductoThumb({ producto, sizeClass }) {
  if (producto.imagenUrl) {
    return (
      <img src={producto.imagenUrl} alt={producto.nombre} className={`${sizeClass} object-cover`} style={{ backgroundColor: 'var(--hc-surface-2)' }} />
    )
  }
  const iconClass = sizeClass.includes('w-12') ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className={`${sizeClass} flex items-center justify-center`} style={{ backgroundColor: 'var(--hc-surface-2)' }}>
      <BoxIcon className={iconClass} />
    </div>
  )
}

function BotonDestacado({ producto, onToggle }) {
  return (
    <button type="button"
      onClick={() => onToggle(producto)}
      title={producto.destacado ? 'Quitar destacado' : 'Marcar como destacado'}
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
      style={producto.destacado
        ? { color: '#8a5a00', backgroundColor: '#f7ead2' }
        : { color: 'var(--hc-muted)', opacity: 0.5 }}
    >
      <StarIcon filled={producto.destacado} />
    </button>
  )
}

function estiloCarrusel(enCarrusel, lleno) {
  if (enCarrusel) return { backgroundColor: 'rgba(23,71,168,0.12)', border: '1px solid rgba(23,71,168,0.3)', color: 'var(--hc-accent)' }
  if (lleno) return { color: 'var(--hc-muted)', opacity: 0.3, cursor: 'not-allowed' }
  return { color: 'var(--hc-muted)', opacity: 0.5 }
}

function BotonCarrusel({ producto, carruselSlots, onToggle }) {
  const lleno = carruselSlots.length >= 5
  const title = tituloCarrusel(producto, lleno)
  return (
    <button type="button"
      onClick={() => onToggle(producto)}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-all text-sm"
      style={estiloCarrusel(producto.enCarrusel, lleno)}
    >
      {producto.enCarrusel ? (
        <span className="text-[10px] font-bold">{producto.ordenCarrusel}</span>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.636-6.364-2.122 2.122M8.758 15.242l-2.122 2.122m0-12.728 2.122 2.122m6.364 6.364 2.122 2.122"/>
        </svg>
      )}
    </button>
  )
}

function tituloCarrusel(producto, lleno) {
  if (producto.enCarrusel) return `Quitar del carrusel (pos. ${producto.ordenCarrusel})`
  if (lleno) return 'Carrusel lleno (5/5)'
  return 'Agregar al carrusel'
}

function CeldaSkuOMovimiento({ producto, vistaSimple }) {
  if (vistaSimple) {
    const movimiento = etiquetaMovimiento(producto)
    return <Badge variant={movimiento === 'Se vende' ? 'success' : 'warning'}>{movimiento}</Badge>
  }
  return (
    <div className="space-y-0.5">
      {producto.sku && <p className="text-[10px] font-mono" style={{ color: 'var(--hc-muted)' }}>SKU: {producto.sku}</p>}
      {producto.barcode && <p className="text-[10px] font-mono" style={{ color: 'var(--hc-accent)', opacity: 0.8 }}>BC: {producto.barcode}</p>}
      {!producto.sku && !producto.barcode && <span className="text-[10px]" style={{ color: 'var(--hc-muted)', opacity: 0.5 }}>—</span>}
    </div>
  )
}

function AccionesDesktop({ producto, t, onEdit, onKardex, onDelete, onOferta, onOcultar, vistaSimple }) {
  if (vistaSimple) {
    const visible = producto.visibleCatalogo !== false
    return (
      <div className="flex gap-2">
        <button type="button" onClick={() => onEdit(producto)} className="px-3 py-1 text-xs rounded-lg" style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>{t('admin.products.edit')}</button>
        <button type="button" onClick={() => onOferta(producto)} disabled={producto.enOferta} className="px-3 py-1 text-xs rounded-lg disabled:opacity-40" style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-accent)' }}>
          {producto.enOferta ? 'En oferta' : 'Oferta'}
        </button>
        <button type="button" onClick={() => onOcultar(producto)} className="px-3 py-1 text-xs rounded-lg" style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    )
  }
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onEdit(producto)} className="px-3 py-1 text-xs rounded-lg transition-colors hover:bg-[var(--hc-surface-2)]" style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>{t('admin.products.edit')}</button>
      <button type="button" onClick={() => onKardex(producto)} className="px-3 py-1 text-xs rounded-lg transition-colors hover:bg-[var(--hc-surface-2)]" style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }} title="Ver kardex">Kardex</button>
      <button type="button" onClick={() => onDelete(producto.id, producto.nombre)} className="px-3 py-1 text-xs rounded-lg transition-colors hover:bg-red-500/15" style={{ backgroundColor: 'rgba(220,38,38,0.06)', color: '#a8291f' }}>{t('admin.products.delete')}</button>
    </div>
  )
}

export default function FilaProducto({ producto, isAdmin, carruselSlots, t, onToggleDestacado, onToggleCarrusel, onEdit, onKardex, onDelete, onOferta, onOcultar, vistaSimple }) {
  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="transition-colors hover:bg-[var(--hc-surface-2)]" style={{ borderTop: '1px solid var(--hc-border)' }}>
      {isAdmin && (
        <td className="px-4 py-3">
          <BotonDestacado producto={producto} onToggle={onToggleDestacado} />
        </td>
      )}
      {isAdmin && (
        <td className="px-4 py-3">
          <BotonCarrusel producto={producto} carruselSlots={carruselSlots} onToggle={onToggleCarrusel} />
        </td>
      )}
      {!vistaSimple && (
        <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>#{producto.id}</td>
      )}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <ProductoThumb producto={producto} sizeClass="w-8 h-8 rounded-lg" />
          <div className="min-w-0">
            <span className="font-medium truncate block" style={{ color: 'var(--hc-text)' }} title={producto.nombre}>{producto.nombre}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {producto.categoriaNombre && <span className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>{producto.categoriaNombre}</span>}
              {producto.especificaciones && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ color: 'var(--hc-accent)', backgroundColor: 'rgba(23,71,168,0.08)' }}>con specs</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 font-medium" style={{ color: 'var(--hc-text)' }}>{formatPrice(producto.precio)}</td>
      <td className="px-4 py-3">
        <Badge variant={varianteStock(producto.stock)}>{producto.stock}</Badge>
      </td>
      <td className="px-4 py-3">
        <CeldaSkuOMovimiento producto={producto} vistaSimple={vistaSimple} />
      </td>
      <td className="px-4 py-3">
        <Badge variant={conditionVariant(producto.condicion)}>{conditionLabel(producto.condicion)}</Badge>
      </td>
      {isAdmin && (
        <td className="px-4 py-3 text-center">
          <SeoStatusIcon product={producto} />
        </td>
      )}
      <td className="px-4 py-3">
        <AccionesDesktop producto={producto} t={t} onEdit={onEdit} onKardex={onKardex} onDelete={onDelete} onOferta={onOferta} onOcultar={onOcultar} vistaSimple={vistaSimple} />
      </td>
    </motion.tr>
  )
}

export function TarjetaProducto({ producto, t, onEdit, onKardex, onDelete, onOferta, onOcultar, vistaSimple }) {
  const visible = producto.visibleCatalogo !== false
  return (
    <div className="p-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <ProductoThumb producto={producto} sizeClass="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" style={{ color: 'var(--hc-text)' }}>{producto.nombre}</p>
          <p className="text-xs truncate" style={{ color: 'var(--hc-muted)' }}>
            {vistaSimple ? etiquetaMovimiento(producto) : (producto.sku ?? `#${producto.id}`)}
            {producto.categoriaNombre ? ` · ${producto.categoriaNombre}` : ''}
            {vistaSimple && !visible ? ' · Oculto' : ''}
          </p>
        </div>
        <Badge variant={conditionVariant(producto.condicion)}>{conditionLabel(producto.condicion)}</Badge>
      </div>
      <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '1px solid var(--hc-border)' }}>
        <div className="flex items-center gap-4">
          <span className="font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>{formatPrice(producto.precio)}</span>
          <Badge variant={varianteStock(producto.stock)}>{producto.stock}</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <button type="button" onClick={() => onEdit(producto)} style={{ color: 'var(--hc-accent)' }}>{t('admin.products.edit')}</button>
          {vistaSimple ? (
            <>
              <button type="button" onClick={() => onOferta(producto)} disabled={producto.enOferta} style={{ color: 'var(--hc-accent)' }}>
                {producto.enOferta ? 'En oferta' : 'Oferta'}
              </button>
              <button type="button" onClick={() => onOcultar(producto)} style={{ color: 'var(--hc-muted)' }}>
                {visible ? 'Ocultar' : 'Mostrar'}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => onKardex(producto)} style={{ color: 'var(--hc-muted)' }}>Kardex</button>
              <button type="button" onClick={() => onDelete(producto.id, producto.nombre)} style={{ color: '#a8291f' }}>{t('admin.products.delete')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
