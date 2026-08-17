import { motion } from 'framer-motion'
import { ESTADOS, ESTADO_CFG, waLinkGarantia } from './garantiaHelpers'
import GarantiaEstadoBadge from './GarantiaEstadoBadge'

export default function GarantiaDetalleDrawer({
  selected,
  nuevoEstado,
  notas,
  saving,
  onClose,
  onNuevoEstado,
  onNotas,
  onGuardar,
}) {
  if (!selected) return null

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose} />

      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md shadow-2xl flex flex-col"
        style={{ backgroundColor: 'var(--hc-surface)', borderLeft: '1px solid var(--hc-border)' }}>

        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--hc-border)' }}>
          <div>
            <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>
              Solicitud #{selected.id}
            </h2>
            <GarantiaEstadoBadge estado={selected.estado} />
          </div>
          <button type="button" onClick={onClose} className="text-2xl leading-none"
            style={{ color: 'var(--hc-muted)' }}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--hc-surface-2)' }}>
            {selected.productoImagenUrl && (
              <img src={selected.productoImagenUrl} alt=""
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                style={{ border: '1px solid var(--hc-border)' }} />
            )}
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--hc-muted)' }}>Producto</p>
              <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
                {selected.productoNombre || `#${selected.productoId}`}
              </p>
              {selected.numeroPedido && (
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  Pedido #{selected.numeroPedido}
                </p>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Cliente</p>
            <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
              {selected.usuarioNombre || 'Sin nombre'}
            </p>
            {selected.usuarioCorreo && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>✉ {selected.usuarioCorreo}</p>
            )}
            {selected.usuarioTelefono && (
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>📱 {selected.usuarioTelefono}</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Problema reportado</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-text)', whiteSpace: 'pre-wrap' }}>
              {selected.descripcion}
            </p>
          </div>

          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            Recibida: {new Date(selected.fechaCreacion).toLocaleDateString('es-CR', {
              day: '2-digit', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>

          <hr style={{ borderColor: 'var(--hc-border)' }} />

          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--hc-muted)' }}>Estado</p>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS.map(e => {
                const cfg = ESTADO_CFG[e]
                return (
                  <button type="button" key={e}
                    onClick={() => onNuevoEstado(e)}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold transition-all"
                    style={{
                      backgroundColor: nuevoEstado === e ? cfg.bg : 'var(--hc-surface-2)',
                      color: nuevoEstado === e ? cfg.color : 'var(--hc-muted)',
                      border: `1.5px solid ${nuevoEstado === e ? cfg.color : 'var(--hc-border)'}`,
                    }}>
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
              Nota para el cliente (visible)
            </p>
            <textarea rows={4}
              value={notas}
              onChange={e => onNotas(e.target.value)}
              placeholder="Ej: Revisamos tu caso y te enviamos el reemplazo esta semana..."
              className="w-full rounded-xl text-sm resize-none"
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--hc-surface-2)',
                border: '1.5px solid var(--hc-border)',
                color: 'var(--hc-text)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div className="p-5 flex gap-3" style={{ borderTop: '1px solid var(--hc-border)' }}>
          {waLinkGarantia(selected) && (
            <a href={waLinkGarantia(selected)} target="_blank" rel="noopener noreferrer"
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-center"
              style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25d366' }}>
              💬 WhatsApp
            </a>
          )}
          <button type="button" onClick={onGuardar} disabled={saving}
            className="flex-1 py-3 rounded-2xl text-sm font-bold disabled:opacity-50"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            {saving
              ? <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Guardando…
                </span>
              : 'Guardar cambios'
            }
          </button>
        </div>
      </motion.div>
    </>
  )
}
