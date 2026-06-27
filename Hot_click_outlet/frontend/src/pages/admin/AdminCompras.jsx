import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { compraService } from '@/services/compraService'
import { useToast } from '@/components/ui/Toast'

const fmt     = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CR') : '—'

const ESTADO_META = {
  PENDIENTE:  { label: 'Pendiente',  bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
  PARCIAL:    { label: 'Parcial',    bg: 'rgba(96,165,250,0.12)',  text: '#6490EA' },
  RECIBIDA:   { label: 'Recibida',   bg: 'rgba(52,211,153,0.12)', text: '#34d399' },
  CANCELADA:  { label: 'Cancelada',  bg: 'rgba(239,68,68,0.12)',  text: '#f87171' },
}

function EstadoBadge({ estado }) {
  const m = ESTADO_META[estado] ?? { label: estado, bg: 'rgba(255,255,255,0.06)', text: 'var(--hc-muted)' }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: m.bg, color: m.text }}>{m.label}</span>
  )
}

/* Modal para recibir mercancía */
function RecibirModal({ orden, onClose, onDone }) {
  const { showToast } = useToast()
  const [cantidades, setCantidades] = useState(
    (orden.items ?? []).reduce((acc, it) => ({ ...acc, [it.id]: it.cantidad - it.cantidadRecibida }), {})
  )
  const [saving, setSaving] = useState(false)

  const handleConfirmar = async () => {
    const items = Object.entries(cantidades)
      .map(([itemId, cantidadRecibida]) => ({ itemId: Number(itemId), cantidadRecibida: parseInt(cantidadRecibida) || 0 }))
      .filter(it => it.cantidadRecibida > 0)

    if (items.length === 0) { showToast('Ingresá al menos una cantidad', 'error'); return }

    setSaving(true)
    try {
      await compraService.recibir(orden.id, { items })
      showToast('Recepción registrada y stock actualizado', 'success')
      onDone()
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al recibir', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>
            Recibir mercancía — {orden.numeroOrden}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>✕</button>
        </div>

        <div className="space-y-3">
          {(orden.items ?? []).map(item => {
            const pendiente = item.cantidad - item.cantidadRecibida
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-xl p-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>
                    {item.producto?.nombreProducto ?? 'Producto'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    Ordenado: {item.cantidad} · Recibido: {item.cantidadRecibida} · Pendiente: {pendiente}
                  </p>
                </div>
                <div className="w-24">
                  <input
                    type="number" min={0} max={pendiente}
                    value={cantidades[item.id] ?? 0}
                    onChange={e => { const v = Math.max(0, Math.min(pendiente, parseInt(e.target.value) || 0)); setCantidades(c => ({ ...c, [item.id]: v })) }}
                    disabled={pendiente <= 0}
                    className="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          Cada cantidad recibida incrementará el stock del producto automáticamente.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            Cancelar
          </button>
          <button onClick={handleConfirmar} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: '#34d399', color: '#000' }}>
            {saving ? 'Registrando…' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminCompras() {
  const { showToast } = useToast()
  const [ordenes, setOrdenes]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [filtro,  setFiltro]          = useState('TODAS')
  const [expanded, setExpanded]       = useState(null)
  const [recibirOrden, setRecibirOrden] = useState(null)

  const FILTROS = ['TODAS','PENDIENTE','PARCIAL','RECIBIDA','CANCELADA']

  const load = () => {
    setLoading(true)
    compraService.listar()
      .then(setOrdenes)
      .catch(() => showToast('Error al cargar órdenes', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const ordenesFiltradas = filtro === 'TODAS'
    ? ordenes
    : ordenes.filter(o => o.estado === filtro)

  const handleCancelar = async (id) => {
    if (!window.confirm('¿Cancelar esta orden?')) return
    try {
      await compraService.cancelar(id)
      showToast('Orden cancelada', 'success')
      load()
    } catch {
      showToast('Error al cancelar', 'error')
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Órdenes de compra</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{ordenesFiltradas.length} orden{ordenesFiltradas.length !== 1 ? 'es' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filtros */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {FILTROS.map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  backgroundColor: filtro === f ? 'var(--hc-accent)' : 'var(--hc-surface)',
                  color: filtro === f ? '#fff' : 'var(--hc-muted)',
                }}>
                {f === 'TODAS' ? 'Todas' : ESTADO_META[f]?.label ?? f}
              </button>
            ))}
          </div>
          <Link to="/admin/compras/nueva"
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            + Nueva orden
          </Link>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
        </div>
      ) : ordenesFiltradas.length === 0 ? (
        <div className="text-center py-16 rounded-2xl"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            {filtro === 'TODAS' ? 'No hay órdenes de compra' : `No hay órdenes ${ESTADO_META[filtro]?.label?.toLowerCase()}`}
          </p>
          <Link to="/admin/compras/nueva" className="mt-3 inline-block text-sm font-medium" style={{ color: 'var(--hc-accent)' }}>
            + Crear primera orden
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {ordenesFiltradas.map(orden => (
            <div key={orden.id} className="rounded-2xl overflow-hidden border"
              style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              {/* Fila principal */}
              <div className="flex items-center gap-4 p-4 cursor-pointer"
                role="button" tabIndex={0}
                onClick={() => setExpanded(expanded === orden.id ? null : orden.id)}
                onKeyDown={(e) => e.key === 'Enter' && setExpanded(expanded === orden.id ? null : orden.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                      {orden.numeroOrden}
                    </span>
                    <EstadoBadge estado={orden.estado} />
                    {orden.proveedor && (
                      <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                        {orden.proveedor.nombre}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: 'var(--hc-muted)' }}>
                    <span>{fmtDate(orden.fechaOrden)}</span>
                    <span>{(orden.items ?? []).length} ítem{(orden.items ?? []).length !== 1 ? 's' : ''}</span>
                    {orden.usuario && <span>por {orden.usuario.nombre}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold" style={{ color: 'var(--hc-accent)' }}>₡{fmt(orden.total)}</p>
                  {orden.fechaRecepcion && (
                    <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>Recibida {fmtDate(orden.fechaRecepcion)}</p>
                  )}
                </div>
                {/* Acciones */}
                <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  {(orden.estado === 'PENDIENTE' || orden.estado === 'PARCIAL') && (
                    <button onClick={() => setRecibirOrden(orden)}
                      className="px-3 py-1.5 text-xs rounded-lg font-medium transition-opacity hover:opacity-80"
                      style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                      Recibir
                    </button>
                  )}
                  {orden.estado === 'PENDIENTE' && (
                    <button onClick={() => handleCancelar(orden.id)}
                      className="px-3 py-1.5 text-xs rounded-lg transition-opacity hover:opacity-80"
                      style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                      Cancelar
                    </button>
                  )}
                </div>
                <svg className={`w-4 h-4 shrink-0 transition-transform ${expanded === orden.id ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                  style={{ color: 'var(--hc-muted)' }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>

              {/* Detalle expandible */}
              {expanded === orden.id && (
                <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-xs">
                    <thead>
                      <tr style={{ color: 'var(--hc-muted)' }}>
                        {['Producto','Ordenado','Recibido','P. Unitario','Subtotal'].map(h => (
                          <th key={h} className="text-left pb-2 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(orden.items ?? []).map(item => (
                        <tr key={item.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                          <td className="py-2" style={{ color: 'var(--hc-text)' }}>
                            {item.producto?.nombreProducto ?? 'Producto'}
                          </td>
                          <td className="py-2" style={{ color: 'var(--hc-muted)' }}>{item.cantidad}</td>
                          <td className="py-2" style={{ color: item.cantidadRecibida >= item.cantidad ? '#34d399' : 'var(--hc-muted)' }}>
                            {item.cantidadRecibida}
                          </td>
                          <td className="py-2" style={{ color: 'var(--hc-muted)' }}>₡{fmt(item.precioUnitario)}</td>
                          <td className="py-2 font-medium" style={{ color: 'var(--hc-text)' }}>
                            ₡{fmt(item.cantidad * item.precioUnitario)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  {orden.notas && (
                    <p className="mt-3 text-xs" style={{ color: 'var(--hc-muted)' }}>Notas: {orden.notas}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal recibir */}
      {recibirOrden && (
        <RecibirModal
          orden={recibirOrden}
          onClose={() => setRecibirOrden(null)}
          onDone={() => { setRecibirOrden(null); load() }}
        />
      )}
    </div>
  )
}
