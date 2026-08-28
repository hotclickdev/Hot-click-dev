import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ESTADOS, parseFotosUrls, waLinkServicio } from './servicioHelpers'
import type { SolicitudServicio } from './servicioHelpers'
import ServicioEstadoBadge from './ServicioEstadoBadge'
import TrustGlyph from '@/components/ui/TrustGlyph'

export default function ServicioList({ solicitudes, filtroEstado, isLoading, onOpenDetalle, onSetFiltro }: {
  solicitudes: SolicitudServicio[]
  filtroEstado: string
  isLoading: boolean
  onOpenDetalle: (s: SolicitudServicio) => void
  onSetFiltro: (e: string) => void
}) {
  const { t } = useTranslation()

  const filtradas = filtroEstado === 'TODOS'
    ? solicitudes
    : solicitudes.filter(s => s.estado === filtroEstado)

  const pendientes = solicitudes.filter(s => s.estado === 'PENDIENTE').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: 'var(--hc-font-display)', color: 'var(--hc-text)' }}>
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

      <div className="flex flex-wrap gap-2 mb-5">
        {['TODOS', ...ESTADOS].map(e => (
          <button type="button" key={e}
            onClick={() => onSetFiltro(e)}
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

      {isLoading ? (
        <div className="text-center py-20" style={{ color: 'var(--hc-muted)' }}>
          <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
          {t('adminSolicitudes.loading')}
        </div>
      ) : !filtradas.length ? (
        <div className="text-center py-20 rounded-2xl"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className="flex justify-center mb-3 opacity-40" style={{ color: 'var(--hc-muted)' }}>
            <TrustGlyph tipo="lista" className="w-10 h-10" />
          </div>
          <p style={{ color: 'var(--hc-muted)' }}>{filtroEstado !== 'TODOS' ? t('adminSolicitudes.noRequestsFiltered') : t('adminSolicitudes.noRequests')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(s => {
            const fotos = parseFotosUrls(s.fotosUrls)
            const wa = waLinkServicio(s)
            return (
              <motion.div key={s.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl cursor-pointer transition-all hover:shadow-md"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                onClick={() => onOpenDetalle(s)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>#{s.id}</span>
                      <ServicioEstadoBadge estado={s.estado} />
                      <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                        {new Date(s.fechaCreacion).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-medium line-clamp-2 mb-1" style={{ color: 'var(--hc-text)' }}>
                      {s.descripcion}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                      {(s.nombreContacto || s.usuario?.nombre) && (
                        <span>{s.nombreContacto || `${s.usuario?.nombre ?? ''} ${s.usuario?.apellidoPaterno || ''}`}</span>
                      )}
                      {s.presupuesto && <span>{s.presupuesto}</span>}
                      {fotos.length > 0 && <span>{t('adminSolicitudes.photos', { count: fotos.length })}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
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
  )
}
