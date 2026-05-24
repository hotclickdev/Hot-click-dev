import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import { servicioService } from '@/services/servicioService'

const ESTADOS = ['PENDIENTE', 'EN_BUSQUEDA', 'ENCONTRADO', 'NO_ENCONTRADO', 'CANCELADO']

const ESTADO_STYLES = {
  PENDIENTE:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  EN_BUSQUEDA:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ENCONTRADO:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  NO_ENCONTRADO: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  CANCELADO:     { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

function EstadoBadge({ estado }) {
  const { t } = useTranslation()
  const m = ESTADO_STYLES[estado] || ESTADO_STYLES.PENDIENTE
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ color: m.color, backgroundColor: m.bg }}>
      {t(`adminSolicitudes.status.${estado}`, { defaultValue: estado })}
    </span>
  )
}

export default function AdminSolicitudesServicio() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [selected, setSelected] = useState(null)
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [fotoModal, setFotoModal] = useState(null)

  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ['admin-solicitudes-servicio'],
    queryFn: () => servicioService.listarTodas().then(r => r.data),
  })

  const filtradas = filtroEstado === 'TODOS'
    ? solicitudes
    : solicitudes.filter(s => s.estado === filtroEstado)

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
      await servicioService.cambiarEstado(selected.id, nuevoEstado, notas)
      qc.invalidateQueries({ queryKey: ['admin-solicitudes-servicio'] })
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }

  const handleEliminar = async (id) => {
    if (!confirm(t('adminSolicitudes.confirmDelete'))) return
    await servicioService.eliminar(id)
    qc.invalidateQueries({ queryKey: ['admin-solicitudes-servicio'] })
    setSelected(null)
  }

  const waLink = (s) => {
    const tel = s.telefonoContacto || s.usuario?.telefono || ''
    if (!tel) return null
    const num = tel.replace(/\D/g, '')
    const full = num.startsWith('506') ? num : `506${num}`
    const msg = encodeURIComponent(
      `Hola ${s.nombreContacto || s.usuario?.nombre || ''}! 👋 Te contactamos de HOTCLICK sobre tu solicitud de "${s.descripcion.slice(0, 60)}${s.descripcion.length > 60 ? '...' : ''}".`
    )
    return `https://wa.me/${full}?text=${msg}`
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-black" style={{ fontFamily: "'Barlow', sans-serif", color: 'var(--hc-text)' }}>
              {t('adminSolicitudes.title')}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--hc-muted)' }}>
              {t('adminSolicitudes.subtitle')}
            </p>
          </div>
          {pendientes > 0 && (
            <span className="px-3 py-1.5 rounded-full text-sm font-bold"
              style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              {t('adminSolicitudes.pending', { count: pendientes })}
            </span>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-5">
          {['TODOS', ...ESTADOS].map(e => (
            <button key={e}
              onClick={() => setFiltroEstado(e)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: filtroEstado === e ? 'var(--hc-accent)' : 'var(--hc-surface)',
                color: filtroEstado === e ? '#fff' : 'var(--hc-muted)',
                border: '1px solid var(--hc-border)',
              }}>
              {e === 'TODOS' ? t('adminSolicitudes.filterAll') : t(`adminSolicitudes.status.${e}`, { defaultValue: e })}
              {e !== 'TODOS' && (
                <span className="ml-1 opacity-70">
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
            {t('adminSolicitudes.loading')}
          </div>
        ) : !filtradas.length ? (
          <div className="text-center py-20 rounded-2xl"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <div className="text-4xl mb-3">📋</div>
            <p style={{ color: 'var(--hc-muted)' }}>{filtroEstado !== 'TODOS' ? t('adminSolicitudes.noRequestsFiltered') : t('adminSolicitudes.noRequests')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.map(s => {
              const fotos = s.fotosUrls ? JSON.parse(s.fotosUrls) : []
              const wa = waLink(s)
              return (
                <motion.div key={s.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl cursor-pointer transition-all hover:shadow-md"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                  onClick={() => openDetalle(s)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>#{s.id}</span>
                        <EstadoBadge estado={s.estado} />
                        <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                          {new Date(s.fechaCreacion).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm font-medium line-clamp-2 mb-1" style={{ color: 'var(--hc-text)' }}>
                        {s.descripcion}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                        {(s.nombreContacto || s.usuario?.nombre) && (
                          <span>👤 {s.nombreContacto || `${s.usuario.nombre} ${s.usuario.apellidoPaterno || ''}`}</span>
                        )}
                        {s.presupuesto && <span>💰 {s.presupuesto}</span>}
                        {fotos.length > 0 && <span>📸 {t('adminSolicitudes.photos', { count: fotos.length })}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                          style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25d366' }}>
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Drawer detalle */}
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
              <div className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: 'var(--hc-border)' }}>
                <div>
                  <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>{t('adminSolicitudes.requestId', { id: selected.id })}</h2>
                  <EstadoBadge estado={selected.estado} />
                </div>
                <button onClick={() => setSelected(null)} className="text-xl" style={{ color: 'var(--hc-muted)' }}>×</button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Cliente */}
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>{t('adminSolicitudes.clientSection')}</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
                    {selected.nombreContacto || (selected.usuario ? `${selected.usuario.nombre} ${selected.usuario.apellidoPaterno || ''}` : t('adminSolicitudes.anonymous'))}
                  </p>
                  {(selected.telefonoContacto || selected.usuario?.telefono) && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                      📱 {selected.telefonoContacto || selected.usuario?.telefono}
                    </p>
                  )}
                  {selected.usuario?.correo && (
                    <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>✉ {selected.usuario.correo}</p>
                  )}
                </div>

                {/* Descripción */}
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>{t('adminSolicitudes.descSection')}</p>
                  <p className="text-sm" style={{ color: 'var(--hc-text)', whiteSpace: 'pre-wrap' }}>{selected.descripcion}</p>
                </div>

                {selected.presupuesto && (
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>{t('adminSolicitudes.budgetSection')}</p>
                    <p className="text-sm" style={{ color: 'var(--hc-text)' }}>{selected.presupuesto}</p>
                  </div>
                )}

                {/* Fotos */}
                {selected.fotosUrls && (() => {
                  const urls = JSON.parse(selected.fotosUrls)
                  return urls.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--hc-muted)' }}>{t('adminSolicitudes.photosSection')}</p>
                      <div className="flex flex-wrap gap-3">
                        {urls.map((url, i) => (
                          <div key={i} className="flex flex-col items-center gap-1.5">
                            <img src={url} alt=""
                              className="w-24 h-24 rounded-xl object-cover cursor-zoom-in"
                              style={{ border: '1px solid var(--hc-border)' }}
                              onClick={() => setFotoModal(url)} />
                            <a
                              href={`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                              style={{ backgroundColor: 'rgba(66,133,244,0.10)', color: '#4285f4' }}
                              title="Buscar producto por imagen en Google Lens">
                              🔍 Lens
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

                {/* Estado */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--hc-muted)' }}>{t('adminSolicitudes.changeStatus')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ESTADOS.map(e => (
                      <button key={e} onClick={() => setNuevoEstado(e)}
                        className="py-2 px-3 rounded-xl text-xs font-semibold transition-all text-left"
                        style={{
                          backgroundColor: nuevoEstado === e ? ESTADO_STYLES[e].bg : 'var(--hc-surface-2)',
                          color: nuevoEstado === e ? ESTADO_STYLES[e].color : 'var(--hc-muted)',
                          border: `1px solid ${nuevoEstado === e ? ESTADO_STYLES[e].color : 'transparent'}`,
                        }}>
                        {t(`adminSolicitudes.status.${e}`, { defaultValue: e })}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>{t('adminSolicitudes.notesSection')}</p>
                  <textarea rows={3}
                    placeholder={t('adminSolicitudes.notesPh')}
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm resize-none outline-none"
                    style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
                </div>

                {/* WhatsApp */}
                {waLink(selected) && (
                  <a href={waLink(selected)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25d366' }}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.526 5.858L.057 23.75a.75.75 0 00.944.944l5.892-1.469A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 01-5.079-1.39l-.363-.215-3.762.937.956-3.76-.234-.375A9.974 9.974 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                    {t('adminSolicitudes.whatsappContact')}
                  </a>
                )}
              </div>

              {/* Footer acciones */}
              <div className="px-5 py-4 flex gap-3 border-t" style={{ borderColor: 'var(--hc-border)' }}>
                <button onClick={() => handleEliminar(selected.id)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  {t('adminSolicitudes.delete')}
                </button>
                <button onClick={handleGuardar} disabled={saving}
                  className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                  {saving ? t('adminSolicitudes.saving') : t('adminSolicitudes.save')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox fotos */}
      <AnimatePresence>
        {fotoModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setFotoModal(null)}>
            <img src={fotoModal} alt="" className="max-w-full max-h-full rounded-2xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
