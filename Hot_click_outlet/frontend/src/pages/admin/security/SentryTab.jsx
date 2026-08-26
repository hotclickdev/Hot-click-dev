import { Card } from './securityUi'

export default function SentryTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="https://hotclick.sentry.io/issues/?project=javascript" target="_blank" rel="noreferrer">
          <Card className="p-5 flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#818cf8">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Errores React / Frontend</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>Proyecto: javascript · hotclick.sentry.io</p>
            </div>
            <svg className="w-4 h-4 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--hc-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Card>
        </a>
        <a href="https://hotclick.sentry.io/issues/?project=java-spring-boot" target="_blank" rel="noreferrer">
          <Card className="p-5 flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#4ade80">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Errores Java / Backend</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>Proyecto: java-spring-boot · hotclick.sentry.io</p>
            </div>
            <svg className="w-4 h-4 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--hc-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Card>
        </a>
      </div>

      <Card className="p-5 space-y-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Qué monitorea Sentry en HotClick</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
          {[
            ['Frontend React', 'Errores de JavaScript, renders rotos, errores en checkout y carrito'],
            ['Backend Java',   'Excepciones no capturadas, errores 500, fallos en Stripe/S3/SendGrid'],
            ['Alertas Telegram', 'Issue nuevo en producción, nivel error o fatal. Remediación automática solo en fatal'],
            ['Agrupación',       'Errores iguales se agrupan — 100 usuarios con el mismo bug = 1 issue'],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-xl p-3"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--hc-text)' }}>{title}</p>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Alertas en Sentry (completar en la UI)</p>
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          Telegram ya filtra issue nuevo / error / production. En Sentry conviene una alerta de síntoma (tasa de error) y apagar el email de cada issue si ya llega a Telegram.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="https://hotclick.sentry.io/alerts/rules/" target="_blank" rel="noreferrer"
            className="rounded-xl p-3 text-xs hover:opacity-80" style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
            <p className="font-semibold mb-1" style={{ color: 'var(--hc-text)' }}>Reglas de alerta</p>
            <p style={{ color: 'var(--hc-muted)' }}>Crear metric alert: error rate de producción &gt; 1% durante 5 min, un issue por proyecto.</p>
          </a>
          <a href="https://hotclick.sentry.io/settings/account/notifications/" target="_blank" rel="noreferrer"
            className="rounded-xl p-3 text-xs hover:opacity-80" style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
            <p className="font-semibold mb-1" style={{ color: 'var(--hc-text)' }}>Notificaciones de cuenta</p>
            <p style={{ color: 'var(--hc-muted)' }}>Desactivar “Issue Alerts” por email si el webhook a Telegram ya cubre el pager.</p>
          </a>
        </div>
      </Card>

      <Card className="p-5 space-y-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>DSNs configurados</p>
        <div className="space-y-1 text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>
          <p>Frontend: <span style={{ color: 'var(--hc-text)' }}>VITE_SENTRY_DSN en .env.local</span></p>
          <p>Backend: <span style={{ color: 'var(--hc-text)' }}>SENTRY_DSN en EC2 .env</span></p>
        </div>
      </Card>
    </div>
  )
}
