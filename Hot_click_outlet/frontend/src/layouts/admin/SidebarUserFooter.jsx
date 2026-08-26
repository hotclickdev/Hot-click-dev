import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PLAN_LABELS } from './adminSidebarTheme'
import { esUsuarioSistema } from '@/utils/sistemaUser'
import ModeSwitcherWrapper from './ModeSwitcherWrapper'
import TextoFlecha from '@/components/ui/TextoFlecha'

/** Footer del sidebar admin: acciones de cuenta y avatar. */
export default function SidebarUserFooter({
  isLight,
  handleLogout,
  t,
  userRole,
  muted,
  userName,
  tenantLoaded,
  planNombre,
  empresaNombre,
}) {
  return (
    <div className="p-3 space-y-1 shrink-0" style={{ borderTop: `1px solid ${isLight ? 'var(--hc-border)' : 'var(--hc-n-800)'}` }}>
      {isLight ? (
        /* "Ver tienda como cliente" y "Tour del panel" viven en Configuración
           → Plan y cuenta (AdminPlanes.jsx). "Cerrar sesión" también sigue
           ahí, pero por pedido del dueño hay un acceso directo en el sidebar. */
        <>
          <NavLink
            to="/admin/pos"
            className="flex items-center justify-center px-3 py-[11px] rounded-[10px] text-sm font-semibold transition-colors hover:bg-[var(--hc-surface-2)]"
            style={{ color: 'var(--hc-link)', border: '1px solid var(--hc-border)' }}
          >
            <TextoFlecha>Ir a la Caja (POS)</TextoFlecha>
          </NavLink>
          <motion.button
            onClick={handleLogout}
            whileHover={{ color: '#dc2626', backgroundColor: 'rgba(220,38,38,0.06)' }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-sm font-medium transition-colors text-left"
            style={{ color: 'var(--hc-muted)' }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {t('admin.sidebar.cerrarSesion')}
          </motion.button>
        </>
      ) : (
        <>
          <ModeSwitcherWrapper userRole={userRole} />
          <NavLink
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ color: 'var(--hc-link)', backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Ver tienda como cliente
          </NavLink>
          <button type="button"
            onClick={() => globalThis.dispatchEvent(new Event('hc-open-tour'))}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left hover:bg-white/[0.04]"
            style={{ color: muted }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
            Tour del panel
          </button>
          <motion.button
            onClick={handleLogout}
            whileHover={{ backgroundColor: 'rgba(239,68,68,0.06)' }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left"
            style={{ color: '#f87171' }}
          >
            {t('admin.sidebar.cerrarSesion')}
          </motion.button>
        </>
      )}
      <div className={`flex items-center px-3 ${isLight ? 'gap-2.5 pt-3 pb-0.5' : 'gap-2 py-2'}`}>
        <motion.div
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.15 }}
          className={`rounded-full flex items-center justify-center shrink-0 ${isLight ? 'w-[34px] h-[34px] text-[13px] font-bold' : 'w-7 h-7 text-xs font-semibold'}`}
          style={isLight
            ? { backgroundColor: 'var(--hc-link)', color: '#fff' }
            : { backgroundColor: 'rgba(23,71,168,0.15)', color: 'var(--hc-accent)' }}
        >
          {userName?.[0]?.toUpperCase() || 'A'}
        </motion.div>
        <div className="min-w-0">
          <div className={`truncate ${isLight ? 'text-[13px] font-semibold' : 'text-xs'}`} style={{ color: isLight ? 'var(--hc-text)' : 'rgba(255,255,255,0.55)' }}>{userName || 'Admin'}</div>
          {esUsuarioSistema(userRole) && tenantLoaded ? (
            <div className={`truncate ${isLight ? 'text-xs' : 'text-[10px]'}`} style={{ color: muted }}>
              Plan {PLAN_LABELS[planNombre] ?? planNombre}
            </div>
          ) : empresaNombre && (
            <div className="text-[10px] truncate text-amber-400">{empresaNombre}</div>
          )}
        </div>
      </div>
    </div>
  )
}
