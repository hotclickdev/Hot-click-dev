import EstadoBadge from './EstadoBadge'
import type { SolicitudBusqueda, TabBusqueda } from './serviciosHelpers'
import type { Dispatch, SetStateAction } from 'react'
import type { TFunction } from 'i18next'

function ClipboardIcon({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  )
}

function ChatIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function RefreshIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
  )
}

function fotosDeSolicitud(fotosUrls: string | null | undefined): string[] {
  try {
    if (!fotosUrls) return []
    const parsed: unknown = JSON.parse(fotosUrls)
    return Array.isArray(parsed) ? parsed as string[] : []
  } catch { return [] }
}

/** Lista de solicitudes de búsqueda del usuario autenticado. */
export default function ListaSolicitudes({
  misSolicitudes,
  loadingMias,
  refetchMias,
  setTabBusqueda,
  t,
}: {
  misSolicitudes: unknown
  loadingMias: boolean
  refetchMias: () => void
  setTabBusqueda: Dispatch<SetStateAction<TabBusqueda>>
  t: TFunction
}) {
  const solicitudes = Array.isArray(misSolicitudes) ? misSolicitudes as SolicitudBusqueda[] : undefined

  if (loadingMias) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--hc-muted)' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-4"
          style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        {t('serviciosPage.loading')}
      </div>
    )
  }

  if (!solicitudes?.length) {
    return (
      <div className="text-center py-16 rounded-3xl"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="mb-4 flex justify-center" style={{ color: 'var(--hc-muted)' }}>
          <ClipboardIcon />
        </div>
        <p className="font-bold text-lg mb-1" style={{ color: 'var(--hc-text)' }}>Sin solicitudes aún</p>
        <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>Creá una solicitud y te buscamos el producto.</p>
        <button type="button" onClick={() => setTabBusqueda('solicitar')}
          className="px-6 py-3 rounded-2xl text-sm font-bold"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          Nueva solicitud
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => refetchMias()}
          className="text-xs px-3 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5"
          style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>
          <RefreshIcon /> Actualizar
        </button>
      </div>
      {solicitudes.map(s => {
        const fotosS = fotosDeSolicitud(s.fotosUrls)
        const hasNote = s.notasAdmin?.trim()
        return (
          <div key={s.id} className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${hasNote ? 'rgba(23,71,168,0.35)' : 'var(--hc-border)'}` }}>
            {hasNote && (
              <div className="px-5 py-3 flex items-start gap-2"
                style={{ backgroundColor: 'rgba(23,71,168,0.1)', borderBottom: '1px solid rgba(23,71,168,0.2)' }}>
                <span className="shrink-0 mt-0.5" style={{ color: 'var(--hc-accent)' }}><ChatIcon /></span>
                <div>
                  <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--hc-accent)' }}>Respuesta de HotClick</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-text)' }}>{s.notasAdmin}</p>
                </div>
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <EstadoBadge estado={s.estado} />
                <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  {new Date(s.fechaCreacion ?? '').toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="mb-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Tu solicitud</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-text)' }}>{s.descripcion}</p>
              </div>
              {s.presupuesto && (
                <p className="text-xs mb-2" style={{ color: 'var(--hc-muted)' }}>
                  {t('serviciosPage.budgetShowLabel')} {s.presupuesto}
                </p>
              )}
              {fotosS.length > 0 && (
                <div className="flex gap-2">
                  {fotosS.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-16 h-16 rounded-xl object-cover"
                      style={{ border: '1px solid var(--hc-border)' }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
