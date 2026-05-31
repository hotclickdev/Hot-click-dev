import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { garantiaService } from '@/services/garantiaService'

const ESTADOS = ['PENDIENTE', 'EN_REVISION', 'RESUELTA', 'RECHAZADA']

const ESTADO_CFG = {
  PENDIENTE:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   label: 'Pendiente' },
  EN_REVISION: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   label: 'En revisión' },
  RESUELTA:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',   label: 'Resuelta' },
  RECHAZADA:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    label: 'Rechazada' },
}

function EstadoBadge({ estado }) {
  const cfg = ESTADO_CFG[estado] || ESTADO_CFG.PENDIENTE
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

export default function AdminSolicitudesGarantia() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState('TODOS')
  const [selected, setSelected] = useState(null)
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ['admin-solicitudes-garantia'],
    queryFn: () => garantiaService.listarTodas().then(r => r.data?.data ?? []),
    refetchInterval: 60_000,
  })

  const filtradas = filtro === 'TODOS'
    ? solicitudes
    : solicitudes.filter(s => s.estado === filtro)

  const pendientes = solicitudes.filter(s => s.estado === 'PENDIENTE').length

  const openDetalle = (s) => {
    setSelected(s)
    setNuevoEstado(s.estado)
    setNotas(s.notasAdmin || '')
  }

  const handleGuardar = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await garantiaService.cambiarEstado(selected.id, nuevoEstado, notas)
      qc.invalidateQueries({ queryKey: ['admin-solicitudes-garantia'] })
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }

  const waLink = (s) => {
    const tel = s.usuarioTelefono || ''
    if (!tel) return null
    const num = tel.replace(/\D/g, '')
    const full = num.startsWith('506') ? num : `506${num}`
    const msg = encodeURIComponent(
      `Hola ${s.usuarioNombre || ''}! 👋 Te contactamos de HOTCLICK sobre tu solicitud de garantía del producto "${(s.productoNombre || '').slice(0, 50)}".`
    )
    return `https://wa.me/${full}?text=${msg}`
  }

  return (
    <>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black" style={{ fontFamily: "'Barlow', sans-serif", color: 'var(--hc-text)' }}>
              🛡️ Solicitudes de Garantía
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--hc-muted)' }}>
              Reportes de problemas con productos en garantía
            </p>
          </div>
          {pendientes > 0 && (
            <span className="px-3 py-1.5 rounded-full text-sm font-bold"
              style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {['TODOS', ...ESTADOS].map(e => (
            <button key={e}
              onClick={() => setFiltro(e)}
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

        {/* Lista */}
        {isLoading ? (
          <div className="text-center py-20" style={{ color: 'var(--hc-muted)' }}>
            <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3"
              style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
            Cargando solicitudes…
          </div>
        ) : !filtradas.length ? (
          <div className="text-center py-20 rounded-2xl"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <div className="text-4xl mb-3">🛡️</div>
            <p style={{ color: 'var(--hc-muted)' }}>
              {filtro !== 'TODOS' ? 'No hay solicitudes con ese filtro.' : 'No hay solicitudes de garantía aún.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.map(s => {
              const wa = waLink(s)
              return (
                <motion.div key={s.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl cursor-pointer transition-all hover:shadow-md"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                  onClick={() => openDetalle(s)}>

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Fila superior */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>#{s.id}</span>
                        <EstadoBadge estado={s.estado} />
                        <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                          {new Date(s.fechaCreacion).toLocaleDateString('es-CR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Producto */}
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

                      {/* Descripción del problema */}
                      <p className="text-sm line-clamp-2 mb-1" style={{ color: 'var(--hc-muted)' }}>
                        {s.descripcion}
                      </p>

                      {/* Usuario */}
                      {s.usuarioNombre && (
                        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                          👤 {s.usuarioNombre} · {s.usuarioCorreo}
                        </p>
                      )}
                    </div>

                    {/* Acción rápida WA */}
                    {wa && (
                      <div onClick={e => e.stopPropagation()}>
                        <a href={wa} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1"
                          style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25d366' }}>
                          💬 WA
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Nota admin (si existe) */}
                  {s.notasAdmin && (
                    <div className="mt-3 px-3 py-2 rounded-xl text-xs"
                      style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
                      💬 {s.notasAdmin}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Drawer detalle ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelected(null)} />

            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md shadow-2xl flex flex-col"
              style={{ backgroundColor: 'var(--hc-surface)', borderLeft: '1px solid var(--hc-border)' }}>

              {/* Header drawer */}
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--hc-border)' }}>
                <div>
                  <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>
                    Solicitud #{selected.id}
                  </h2>
                  <EstadoBadge estado={selected.estado} />
                </div>
                <button onClick={() => setSelected(null)} className="text-2xl leading-none"
                  style={{ color: 'var(--hc-muted)' }}>×</button>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Producto */}
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

                {/* Cliente */}
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

                {/* Descripción del problema */}
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

                {/* Cambiar estado */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--hc-muted)' }}>Estado</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ESTADOS.map(e => {
                      const cfg = ESTADO_CFG[e]
                      return (
                        <button key={e}
                          onClick={() => setNuevoEstado(e)}
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

                {/* Nota al cliente */}
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                    Nota para el cliente (visible)
                  </p>
                  <textarea rows={4}
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
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

              {/* Footer drawer */}
              <div className="p-5 flex gap-3" style={{ borderTop: '1px solid var(--hc-border)' }}>
                {waLink(selected) && (
                  <a href={waLink(selected)} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-center"
                    style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25d366' }}>
                    💬 WhatsApp
                  </a>
                )}
                <button onClick={handleGuardar} disabled={saving}
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
        )}
      </AnimatePresence>
    </>
  )
}
