import { motion } from 'framer-motion'
import { ESTADOS, ESTADO_CFG, waLinkGarantia } from './garantiaHelpers'
import GarantiaEstadoBadge from './GarantiaEstadoBadge'
import TrustGlyph from '@/components/ui/TrustGlyph'

export default function GarantiaList({ solicitudes, filtro, isLoading, onOpenDetalle, onSetFiltro }) {
  const filtradas = filtro === 'TODOS'
    ? solicitudes
    : solicitudes.filter(s => s.estado === filtro)

  const pendientes = solicitudes.filter(s => s.estado === 'PENDIENTE').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ fontFamily: 'var(--hc-font-display)', color: 'var(--hc-text)' }}>
            <TrustGlyph tipo="garantia" className="w-6 h-6" />
            Solicitudes de Garantía
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            Reportes de problemas con productos en garantía
          </p>
        </div>
        {pendientes > 0 && (
          <span className="px-3 py-1.5 rounded-full text-sm font-bold"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            {pendientes} pendiente{pendientes === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {['TODOS', ...ESTADOS].map(e => (
          <button type="button" key={e}
            onClick={() => onSetFiltro(e)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              backgroundColor: filtro === e ? 'var(--hc-accent)' : 'var(--hc-surface)',
              color: filtro === e ? '#fff' : 'var(--hc-muted)',
              border: '1px solid var(--hc-border)',
            }}>
            {e === 'TODOS' ? 'Todos' : (ESTADO_CFG[e]?.label ?? e)}
            {e !== 'TODOS' && (
              <span className="ml-1 opacity-60">
                ({solicitudes.filter(s => s.estado === e).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-20" style={{ color: 'var(--hc-muted)' }}>
          <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
          Cargando solicitudes…
        </div>
      ) : !filtradas.length ? (
        <div className="text-center py-20 rounded-2xl"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className="mb-3 flex justify-center" style={{ color: 'var(--hc-muted)' }}>
            <TrustGlyph tipo="garantia" className="w-10 h-10 opacity-40" />
          </div>
          <p style={{ color: 'var(--hc-muted)' }}>
            {filtro !== 'TODOS' ? 'No hay solicitudes con ese filtro.' : 'No hay solicitudes de garantía aún.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(s => {
            const wa = waLinkGarantia(s)
            return (
              <motion.div key={s.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl cursor-pointer transition-all hover:shadow-md"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                onClick={() => onOpenDetalle(s)}>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>#{s.id}</span>
                      <GarantiaEstadoBadge estado={s.estado} />
                      <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                        {new Date(s.fechaCreacion).toLocaleDateString('es-CR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {s.productoImagenUrl && (
                        <img src={s.productoImagenUrl} alt=""
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          style={{ border: '1px solid var(--hc-border)' }} />
                      )}
                      <div>
                        <p className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--hc-text)' }}>
                          {s.productoNombre || `Producto #${s.productoId}`}
                        </p>
                        {s.numeroPedido && (
                          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                            Pedido #{s.numeroPedido}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-sm line-clamp-2 mb-1" style={{ color: 'var(--hc-muted)' }}>
                      {s.descripcion}
                    </p>

                    {s.usuarioNombre && (
                      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                        <span className="inline-flex items-center gap-1">
                          <TrustGlyph tipo="clientes" className="w-3 h-3" />
                          {s.usuarioNombre} · {s.usuarioCorreo}
                        </span>
                      </p>
                    )}
                  </div>

                  {wa && (
                    <div>
                      <a href={wa} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1"
                        style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25d366' }}>
                        <TrustGlyph tipo="chat" className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </div>
                  )}
                </div>

                {s.notasAdmin && (
                  <div className="mt-3 px-3 py-2 rounded-xl text-xs"
                    style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
                    <span className="inline-flex items-start gap-1.5">
                      <TrustGlyph tipo="chat" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {s.notasAdmin}
                    </span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
