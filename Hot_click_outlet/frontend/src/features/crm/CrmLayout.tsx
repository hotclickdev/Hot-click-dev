import { Refine } from '@refinedev/core'
import { NavLink, Outlet } from 'react-router-dom'
import { crmDataProvider } from './crmDatos'
import { cx } from './ui/cx'

const PESTANAS = [
  { to: '/plataforma/crm', label: 'Contactos', end: true },
  { to: '/plataforma/crm/compras', label: 'Compras', end: false },
]

/**
 * Base del CRM (fase 0): Refine headless sobre `/api/admin/crm/**`, dentro de la consola
 * (`PlataformaAcceso` ya deja entrar solo a ADMIN). Telemetría de Refine apagada.
 */
export default function CrmLayout() {
  return (
    <Refine
      dataProvider={crmDataProvider}
      resources={[
        { name: 'compras', list: '/plataforma/crm/compras' },
        { name: 'compradores', show: '/plataforma/crm/compradores/:id' },
        { name: 'negocios', show: '/plataforma/crm/negocios/:id' },
      ]}
      options={{ disableTelemetry: true, reactQuery: { clientConfig: { defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } } } }}
    >
      <div className="flex flex-col gap-4">
        <nav aria-label="CRM" className="flex w-fit flex-wrap gap-1 rounded-xl bg-hc-n-100 p-1">
          {PESTANAS.map((p) => (
            <NavLink
              key={p.to}
              to={p.to}
              end={p.end}
              className={({ isActive }) => cx(
                'rounded-[10px] px-3 py-2 text-sm',
                isActive
                  ? 'bg-hc-surface font-semibold text-hc-blue-600 shadow-[0_1px_3px_rgba(20,23,28,.12)]'
                  : 'font-medium text-hc-n-600',
              )}
            >
              {p.label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </Refine>
  )
}
