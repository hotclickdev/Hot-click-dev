import { useEffect, useState } from 'react'
import { securityService } from '@/services/securityService'
import { TabBtn, PeriodSelector } from './security/securityUi'
import DashboardTab from './security/DashboardTab'
import GestionTab from './security/GestionTab'
import UsuariosTab from './security/UsuariosTab'
import IpsTab from './security/IpsTab'
import EventosTab from './security/EventosTab'
import AlertasTab from './security/AlertasTab'
import SentryTab from './security/SentryTab'
import SistemaTab from './security/SistemaTab'

const TABS = [
  { id: 'dashboard', label: 'Dashboard'  },
  { id: 'gestion',   label: 'Gestión'    },
  { id: 'usuarios',  label: 'Seguridad'  },
  { id: 'ips',       label: 'IPs'        },
  { id: 'eventos',   label: 'Eventos'    },
  { id: 'alertas',   label: 'Alertas'    },
  { id: 'sentry',    label: 'Sentry'     },
  { id: 'sistema',   label: 'Sistema'    },
]

export default function AdminSecurityCenter() {
  const [tab, setTab]       = useState('dashboard')
  const [period, setPeriod] = useState('24h')
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    securityService.getDashboard('24h')
      .then(({ data }) => setAlertCount((data as { summary?: { activeAlerts?: number } } | undefined)?.summary?.activeAlerts ?? 0))
      .catch((err: unknown) => { console.error('[AdminSecurityCenter] dashboard', err) })
  }, [])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Security Center</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            Control de seguridad en tiempo real — solo ADMIN
          </p>
        </div>
        {tab === 'dashboard' && <PeriodSelector value={period} onChange={setPeriod} />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit overflow-x-auto"
        style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
        {TABS.map(t => (
          <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}
            badge={t.id === 'alertas' ? alertCount : 0}>
            {t.label}
          </TabBtn>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'dashboard' && <DashboardTab period={period} onPeriodChange={setPeriod} />}
      {tab === 'gestion'   && <GestionTab />}
      {tab === 'usuarios'  && <UsuariosTab />}
      {tab === 'ips'       && <IpsTab />}
      {tab === 'eventos'   && <EventosTab />}
      {tab === 'alertas'   && <AlertasTab />}
      {tab === 'sentry'    && <SentryTab />}
      {tab === 'sistema'   && <SistemaTab />}
    </div>
  )
}
