import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ESTADOS, ESTADO_STYLES, parseFotosUrls, waLinkServicio } from './servicioHelpers'
import ServicioEstadoBadge from './ServicioEstadoBadge'

export default function ServicioDetalleDrawer({
  selected,
  nuevoEstado,
  notas,
  saving,
  onClose,
  onNuevoEstado,
  onNotas,
  onGuardar,
  onEliminar,
  onFotoModal,
}) {
  const { t } = useTranslation()
  if (!selected) return null

  const fotos = parseFotosUrls(selected.fotosUrls)

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
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--hc-border)' }}>
          <div>
            <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>{t('adminSolicitudes.requestId', { id: selected.id })}</h2>
            <ServicioEstadoBadge estado={selected.estado} />
          </div>
          <button onClick={onClose} className="text-xl" style={{ color: 'var(--hc-muted)' }}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
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

          {fotos.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--hc-muted)' }}>{t('adminSolicitudes.photosSection')}</p>
              <div className="flex flex-wrap gap-3">
                {fotos.map((url, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <button type="button" onClick={() => onFotoModal(url)} className="p-0 border-0 bg-transparent block">
                      <img src={url} alt=""
                        className="w-24 h-24 rounded-xl object-cover cursor-zoom-in"
                        style={{ border: '1px solid var(--hc-border)' }} />
                    </button>
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
          )}

          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--hc-muted)' }}>{t('adminSolicitudes.changeStatus')}</p>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS.map(e => (
                <button key={e} onClick={() => onNuevoEstado(e)}
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

          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>{t('adminSolicitudes.notesSection')}</p>
            <textarea rows={3}
              placeholder={t('adminSolicitudes.notesPh')}
              value={notas}
              onChange={e => onNotas(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm resize-none outline-none"
              style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
          </div>

          {waLinkServicio(selected) && (
            <a href={waLinkServicio(selected)} target="_blank" rel="noopener noreferrer"
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

        <div className="px-5 py-4 flex gap-3 border-t" style={{ borderColor: 'var(--hc-border)' }}>
          <button onClick={() => onEliminar(selected.id)}
            className="px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            {t('adminSolicitudes.delete')}
          </button>
          <button onClick={onGuardar} disabled={saving}
            className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-60"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            {saving ? t('adminSolicitudes.saving') : t('adminSolicitudes.save')}
          </button>
        </div>
      </motion.div>
    </>
  )
}

export function ServicioFotoLightbox({ fotoModal, onClose }) {
  if (!fotoModal) return null
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}>
      <img src={fotoModal} alt="" className="max-w-full max-h-full rounded-2xl object-contain" />
    </motion.div>
  )
}
