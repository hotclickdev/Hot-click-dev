import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { productService } from '@/services/productService'
import { crmService } from '@/services/crmService'
import api from '@/services/api'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

// Secciones del admin con sinónimos — permite buscar por nombre cotidiano
const SECCIONES = [
  { label: 'Usuarios / Clientes',   path: '/admin/usuarios',      icon: '👥', keys: ['usuarios','clientes','cliente','usuario','personas','compradores','comprador','gente'] },
  { label: 'Productos',             path: '/admin/productos',      icon: '📦', keys: ['productos','producto','items','articulos','artículos','catalogo','catálogo','inventario'] },
  { label: 'Pedidos',               path: '/admin/pedidos',        icon: '🛍', keys: ['pedidos','pedido','ordenes','orden','ventas','venta','compras del cliente'] },
  { label: 'Marcas',                path: '/admin/marcas',         icon: '🏷', keys: ['marcas','marca','brand','brands','fabricante'] },
  { label: 'Categorías',            path: '/admin/categorias',     icon: '📂', keys: ['categorias','categoria','categorías','departamentos','secciones','tipos'] },
  { label: 'Bodegas / Almacenes',   path: '/admin/bodegas',        icon: '🏭', keys: ['bodegas','bodega','almacen','almacén','almacenes','depósito','deposito','stock','inventario'] },
  { label: 'Finanzas',              path: '/admin/finanzas',       icon: '💰', keys: ['finanzas','finanza','dinero','caja','ingresos','egresos','contabilidad','ganancias'] },
  { label: 'Reportes',              path: '/admin/reportes',       icon: '📊', keys: ['reportes','reporte','informe','informes','estadisticas','estadísticas','analitica'] },
  { label: 'Proveedores',           path: '/admin/proveedores',    icon: '🚚', keys: ['proveedores','proveedor','suppliers','suministros','compras'] },
  { label: 'Compras a Proveedor',   path: '/admin/compras',        icon: '🛒', keys: ['compras','compra','ordenes de compra','orden de compra','reabastecimiento'] },
  { label: 'Caja POS',              path: '/admin/pos',            icon: '🏪', keys: ['caja','pos','punto de venta','venta directa','tienda fisica','cobros'] },
  { label: 'Mesas / QR',            path: '/admin/mesas',          icon: '🪑', keys: ['mesas','mesa','qr','restaurante','salon','comensales'] },
  { label: 'Ofertas / Promociones', path: '/admin/ofertas',        icon: '🏷', keys: ['ofertas','oferta','descuentos','descuento','promociones','promocion','promo'] },
  { label: 'Blog / Publicaciones',  path: '/admin/blog',           icon: '📝', keys: ['blog','articulos','publicaciones','publicacion','noticias','contenido'] },
  { label: 'Publicaciones Auto IA', path: '/admin/publicaciones',  icon: '🤖', keys: ['publicaciones','ia','automatico','generar producto','crear producto','ai','inteligencia'] },
  { label: 'Emprendimientos',       path: '/emprendimientos',      icon: '🏢', keys: ['emprendimientos','emprendimiento','negocios','negocio','pymes','pyme','empresas'] },
  { label: 'Equipo',                path: '/admin/equipo',         icon: '👤', keys: ['equipo','empleados','empleado','staff','trabajadores','colaboradores','miembros'] },
  { label: 'Gift Cards',            path: '/admin/gift-cards',     icon: '🎁', keys: ['gift cards','tarjetas regalo','regalos','regalo','vouchers','voucher','cupon','cupón'] },
  { label: 'API Keys',              path: '/admin/api-keys',       icon: '🔑', keys: ['api','api keys','integraciones','llaves','keys','acceso externo'] },
  { label: 'Configuración',         path: '/admin/configuracion',  icon: '⚙', keys: ['configuracion','configuración','ajustes','settings','config','preferencias'] },
  { label: 'Seguridad',             path: '/admin/seguridad',      icon: '🔒', keys: ['seguridad','security','accesos','permisos','auditoria','logs'] },
  { label: 'Mi Empresa',            path: '/admin/mi-empresa',     icon: '🏠', keys: ['mi empresa','empresa','datos empresa','perfil negocio','negocio','branding'] },
  { label: 'Facturación Electrónica', path: '/admin/facturacion', icon: '🧾', keys: ['facturacion','facturas','hacienda','comprobantes','electronicos','fiscal'] },
  { label: 'Plan / Suscripción',    path: '/admin/suscripcion',    icon: '💳', keys: ['plan','suscripcion','suscripción','billing','pago mensual','upgrade'] },
  { label: 'Observabilidad',        path: '/admin/observabilidad', icon: '📡', keys: ['observabilidad','metricas','métricas','monitoreo','logs','plataforma'] },
  { label: 'Dashboard',             path: '/admin',                icon: '🏠', keys: ['dashboard','inicio','home','panel','resumen','kpi'] },
]

function buscarSecciones(q) {
  const term = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return SECCIONES.filter(s =>
    s.label.toLowerCase().includes(term) ||
    s.keys.some(k => k.includes(term) || term.includes(k.split(' ')[0]))
  ).slice(0, 5)
}

function ResultGroup({ title, items, onSelect }) {
  if (!items.length) return null
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5"
        style={{ color: 'var(--hc-muted)' }}>{title}</p>
      {items.map((item, i) => (
        <button key={i} onClick={() => onSelect(item)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05] rounded-lg"
          style={{ color: 'var(--hc-text)' }}>
          <span className="w-6 h-6 flex items-center justify-center rounded-md shrink-0 text-xs"
            style={{ backgroundColor: `${item.iconColor ?? 'rgba(23,71,168,'}0.15)`, color: item.iconColor ?? 'var(--hc-accent)' }}>
            {item.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>{item.label}</p>
            {item.sub && <p className="text-xs truncate" style={{ color: 'var(--hc-muted)' }}>{item.sub}</p>}
          </div>
          {item.meta && <span className="text-xs shrink-0" style={{ color: 'var(--hc-muted)' }}>{item.meta}</span>}
        </button>
      ))}
    </div>
  )
}

export default function GlobalSearch({ open, onClose }) {
  const navigate   = useNavigate()
  const [q, setQ]  = useState('')
  const [results, setResults] = useState({ productos: [], pedidos: [], clientes: [] })
  const [loading, setLoading] = useState(false)
  const inputRef  = useRef(null)
  const timerRef  = useRef(null)

  useEffect(() => {
    if (open) { setQ(''); setResults({ productos: [], pedidos: [], clientes: [] }); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onClose() }
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const buscar = useCallback((query) => {
    clearTimeout(timerRef.current)
    if (!query.trim() || query.trim().length < 2) { setResults({ productos: [], pedidos: [], clientes: [] }); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const [prods, clientes] = await Promise.allSettled([
          productService.buscar(query),
          crmService.buscarClientes(query),
        ])
        const prodList = prods.status === 'fulfilled' ? (prods.value ?? []) : []
        const clienList = clientes.status === 'fulfilled' ? (clientes.value ?? []) : []

        // Buscar pedidos por número
        let pedidoList = []
        if (/^\d+$/.test(query.trim()) || query.trim().toUpperCase().startsWith('ORD')) {
          try {
            const res = await api.get(`/pedidos/${query.trim()}`)
            const p = res.data?.data ?? res.data
            if (p?.id) pedidoList = [p]
          } catch { /* no pedido */ }
        }

        setResults({
          productos: prodList.slice(0, 5).map(p => ({
            label: p.nombreProducto ?? p.nombre,
            sub: `SKU: ${p.sku ?? '—'} · Stock: ${p.stockActual ?? p.stock ?? 0}`,
            meta: `₡${fmt(p.precioEfectivo ?? p.precioVenta ?? p.precio)}`,
            icon: '📦', iconColor: 'rgba(23,71,168,',
            path: `/admin/productos`,
          })),
          pedidos: pedidoList.slice(0, 3).map(p => ({
            label: `Pedido #${p.id} — ${p.numeroPedido ?? ''}`,
            sub: `${p.estadoPedido ?? ''} · ₡${fmt(p.totalPedido)}`,
            icon: '🧾', iconColor: 'rgba(52,211,153,',
            path: `/admin/pedidos`,
          })),
          clientes: clienList.slice(0, 5).map(c => ({
            label: `${c.nombre ?? ''} ${c.apellidoPaterno ?? ''}`.trim(),
            sub: c.correo,
            meta: `${c.puntosFidelidad ?? 0} pts`,
            icon: '👤', iconColor: 'rgba(151,183,243,',
            path: `/admin/usuarios`,
          })),
        })
      } catch { /* silently fail */ }
      finally { setLoading(false) }
    }, 250)
  }, [])

  const handleChange = (e) => { setQ(e.target.value); buscar(e.target.value) }

  const handleSelect = (item) => {
    onClose()
    if (item.path) navigate(item.path)
  }

  const totalResults = results.productos.length + results.pedidos.length + results.clientes.length
  const hasQuery = q.trim().length >= 2

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}
            viewBox="0 0 24 24" style={{ color: 'var(--hc-muted)' }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={handleChange}
            placeholder="Buscar productos, pedidos, clientes…"
            className="flex-1 text-base bg-transparent outline-none"
            style={{ color: 'var(--hc-text)' }}
          />
          {loading && (
            <div className="w-4 h-4 border-2 rounded-full animate-spin shrink-0"
              style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
          )}
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>Esc</kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!hasQuery && (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>
              Escribí al menos 2 caracteres para buscar
            </div>
          )}
          {hasQuery && !loading && totalResults === 0 && (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>
              Sin resultados para &quot;{q}&quot;
            </div>
          )}
          {totalResults > 0 && (
            <div className="space-y-1">
              <ResultGroup title="Productos" items={results.productos} onSelect={handleSelect}/>
              <ResultGroup title="Pedidos"   items={results.pedidos}   onSelect={handleSelect}/>
              <ResultGroup title="Clientes"  items={results.clientes}  onSelect={handleSelect}/>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t flex items-center gap-3 text-[10px]"
          style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'var(--hc-muted)' }}>
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>Esc cerrar</span>
        </div>
      </div>
    </div>
  )
}
