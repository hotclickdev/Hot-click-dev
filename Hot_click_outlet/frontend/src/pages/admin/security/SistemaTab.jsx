import { useEffect, useState } from 'react'
import { Card } from './securityUi'

export default function SistemaTab() {
  const [serverStatus, setServerStatus] = useState(null)

  useEffect(() => {
    const check = async () => {
      try {
        const t0 = Date.now()
        const res = await fetch('/api/health')
        setServerStatus({ up: res.ok, ms: Date.now() - t0 })
      } catch {
        setServerStatus({ up: false, ms: null })
      }
    }
    check()
  }, [])

  const herramientas = [
    { label: 'Sentry',         desc: 'Errores en producción', href: 'https://sentry.io/',                                                                  color: '#f84f35' },
    { label: 'PostHog',        desc: 'Analytics y sesiones',  href: 'https://app.posthog.com/',                                                            color: '#f9bd2b' },
    { label: 'SonarCloud',     desc: 'Calidad de código',     href: 'https://sonarcloud.io/project/overview?id=hotclickdev_Hot-click-dev',                  color: '#f3702a' },
    { label: 'GitHub Actions', desc: 'CI / CD',               href: 'https://github.com/hotclickdev/Hot-click-dev/actions',                                color: '#4f7cff' },
  ]

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid var(--hc-border)' }}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              serverStatus === null
                ? 'bg-amber-400 animate-pulse'
                : serverStatus.up
                  ? 'bg-emerald-400'
                  : 'bg-red-400 animate-pulse'
            }`} />
            <span className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Servidor hotclick.lat</span>
          </div>
          <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            {serverStatus === null
              ? 'Verificando...'
              : serverStatus.up
                ? `Operativo · ${serverStatus.ms}ms`
                : 'Sin respuesta'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {herramientas.map(({ label, desc, href, color }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              className="flex flex-col gap-1.5 p-3 rounded-xl transition-all group"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--hc-border)'}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--hc-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>{desc}</span>
            </a>
          ))}
        </div>
      </Card>
    </div>
  )
}
