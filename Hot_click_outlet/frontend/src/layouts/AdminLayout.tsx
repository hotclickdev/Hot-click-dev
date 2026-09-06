import type { ReactNode } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import GlobalSearch from '@/components/admin/GlobalSearch'
import TrialBanner from '@/components/TrialBanner'
import OfflineBanner from '@/components/OfflineBanner'
import ImpersonacionBanner from '@/components/ImpersonacionBanner'
import AppTour from '@/components/ui/AppTour'
import MentalModelCoach from '@/components/ui/mentalModel/MentalModelCoach'
import { esUsuarioSistema, esStaffPlataforma } from '@/utils/sistemaUser'
import { RUTA_SISTEMA_VISIBILIDAD } from '@/utils/rutaTienda'
import { buildSidebarLinks } from './admin/adminSidebarLinks'
import SidebarContent, { type RoleBadge } from './admin/SidebarContent'
import AdminMobileHeader from './admin/AdminMobileHeader'
import AdminBottomNav from '@/prototipo/admin/AdminBottomNav'
import { etiquetaChromeAdmin } from './admin/adminChrome'
import { moderacionService } from '@/services/moderacionService'
import type { SidebarLink } from './admin/adminItJobs'

const ROLE_BADGES: Record<string, RoleBadge> = {
  ADMIN:       { label: 'Admin',       color: 'bg-[rgba(13,71,161,0.10)] text-[var(--hc-link)]' },
  SUPPORT:     { label: 'Support',     color: 'bg-[rgba(13,71,161,0.10)] text-[var(--hc-link)]' },
  FINANCE:     { label: 'Finance',     color: 'bg-[rgba(13,71,161,0.10)] text-[var(--hc-link)]' },
  TRUST:       { label: 'Trust',       color: 'bg-[rgba(13,71,161,0.10)] text-[var(--hc-link)]' },
  EMPRENDEDOR: { label: 'Emprendedor', color: 'bg-[rgba(245,158,11,0.12)] text-amber-800 dark:text-amber-200' },
}

/** Shell del panel admin: sidebar, header móvil, drawer y contenido. */
export default function AdminLayout({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const userName = useAuthStore((s) => s.userName)
  const userRole = useAuthStore((s) => s.userRole)
  const permissions = useAuthStore((s) => s.permissions)
  const empresaNombre = useAuthStore((s) => s.empresaNombre)
  const empresaId = useAuthStore((s) => s.empresaId)
  const logout = useAuthStore((s) => s.logout)
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)
  const loadTenantUso = useTenantStore((s) => s.loadTenantUso)
  const clearTenant = useTenantStore((s) => s.clear)
  const estadoEmpresa = useTenantStore((s) => s.estadoEmpresa)
  const visibilidadPublica = useTenantStore((s) => s.visibilidadPublica)
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [searchOpen,    setSearchOpen]    = useState(false)
  const [moderacionTotal, setModeracionTotal] = useState(0)

  // Cargar info del tenant (plan, límites, features) al montar el panel admin
  useEffect(() => {
    if (!empresaId) return
    loadTenantInfo()
    loadTenantUso()
    return () => clearTenant()
  }, [empresaId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userRole !== 'ADMIN' && userRole !== 'TRUST') return
    let cancelado = false
    moderacionService.resumen()
      .then((r) => { if (!cancelado) setModeracionTotal(r.total) })
      .catch(() => { if (!cancelado) setModeracionTotal(0) })
    return () => { cancelado = true }
  }, [userRole, location.pathname])

  // Atajo global Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(s => !s) }
    }
    globalThis.addEventListener('keydown', handler)
    return () => globalThis.removeEventListener('keydown', handler)
  }, [])

  const sidebarLinks: SidebarLink[] = buildSidebarLinks(t, userRole, permissions).map((link) =>
    link.to === '/admin/aprobaciones' && moderacionTotal > 0
      ? { ...link, badge: moderacionTotal }
      : link,
  )
  const handleLogout = () => { logout(); navigate('/') }

  // Cargar estado de empresa para mostrar banners de aprobación / visibilidad
  useEffect(() => {
    if (!esUsuarioSistema(userRole)) return
    import('@/services/api').then(({ default: api }) => {
      api.get<unknown>('/empresa/perfil')
        .then(({ data }) => {
          const root = data && typeof data === 'object' ? data as Record<string, unknown> : null
          const innerRaw: unknown = root?.id ? root : (root?.data ?? data)
          const e = innerRaw && typeof innerRaw === 'object' ? innerRaw as Record<string, unknown> : null
          if (e?.id) {
            useTenantStore.getState().setEmpresaStatus({
              estadoEmpresa: typeof e.estadoEmpresa === 'string' ? e.estadoEmpresa : undefined,
              visibilidadPublica: e.visibilidadPublica === true,
            })
          }
        })
        .catch((err: unknown) => console.error('[AdminLayout] perfil empresa', err))
    })
  }, [userRole, empresaId])

  const roleBadge = (userRole ? ROLE_BADGES[userRole] : undefined) ?? { label: userRole, color: 'bg-[var(--hc-surface-2)] text-[var(--hc-muted)]' }

  const sidebarProps = { sidebarLinks, roleBadge, t, userName, empresaNombre, userRole, handleLogout, onSearch: () => setSearchOpen(true) }
  const esSistema = esUsuarioSistema(userRole)
  const esSuperAdmin = esStaffPlataforma(userRole)
  const temaPanel = esSuperAdmin ? 'hc-superadmin-theme' : 'hc-sistema-theme'
  const anchoSidebar = esSistema || esSuperAdmin ? 'w-[230px]' : 'w-60'
  const margenSidebar = esSistema || esSuperAdmin ? 'md:ml-[230px]' : 'md:ml-60'

  return (
    <div className={`hc-admin-content ${temaPanel} min-h-screen`} style={{ backgroundColor: 'var(--hc-bg)' }}>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* ── Desktop sidebar ── */}
      <aside
        className={`hc-admin-sidebar shrink-0 flex-col fixed inset-y-0 left-0 z-20 hidden md:flex ${anchoSidebar}`}
        style={{ backgroundColor: 'var(--hc-surface)', borderRight: '1px solid var(--hc-border)' }}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* ── Mobile: top header bar ── */}
      <AdminMobileHeader
        etiquetaChrome={etiquetaChromeAdmin(userRole)}
        mostrarCaja={esSistema}
        t={t}
        userName={userName}
        location={location}
        navigate={navigate}
        setDrawerOpen={setDrawerOpen}
      />

      {/* ── Mobile: slide-in drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className={`hc-admin-sidebar fixed inset-y-0 left-0 z-50 flex flex-col md:hidden ${esSistema || esSuperAdmin ? 'w-[230px]' : 'w-64'}`}
              style={{ backgroundColor: 'var(--hc-surface)', borderRight: '1px solid var(--hc-border)' }}
            >
              <SidebarContent {...sidebarProps} onClose={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <div className={`h-screen overflow-hidden flex flex-col pt-14 md:pt-0 ${margenSidebar}`}>
        <ImpersonacionBanner />
        <OfflineBanner />
        <TrialBanner />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`flex-1 overflow-y-auto px-4 py-4 md:pt-6 md:px-6 lg:px-8 ${esSuperAdmin ? 'pb-20 md:pb-6' : ''}`}
        >
          {/* Banner: negocio pendiente de aprobación */}
          {estadoEmpresa === 'PENDIENTE_APROBACION' && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">Tu negocio está pendiente de aprobación</p>
                <p className="text-xs mt-0.5 opacity-80">
                  Un administrador IT revisará tu solicitud. Mientras tanto podés preparar tu catálogo, pero tu tienda no será visible al público hasta recibir la aprobación.
                </p>
              </div>
            </div>
          )}
          {/* Banner: cuenta apagada por HotClick — el dueño no puede republicar */}
          {(estadoEmpresa === 'SUSPENDIDO' || estadoEmpresa === 'INACTIVO') && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">
                  {estadoEmpresa === 'SUSPENDIDO' ? 'Tu cuenta está suspendida' : 'Tu cuenta está desactivada'}
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                  HotClick apagó la cuenta de este negocio. No podés publicar la tienda desde acá.
                </p>
              </div>
            </div>
          )}
          {/* Banner: tienda pausada en catálogo (cuenta ACTIVA; el dueño sí puede republicar) */}
          {estadoEmpresa === 'ACTIVO' && visibilidadPublica === false && (
            <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <span>
                <span className="font-semibold">Tu tienda está pausada en el catálogo</span>
                <span className="ml-2 opacity-80">— los compradores no la ven. Publicála desde</span>
                <Link to={RUTA_SISTEMA_VISIBILIDAD} className="ml-1 underline font-medium">Configuración</Link>.
              </span>
            </div>
          )}
          {children}
        </motion.main>
      </div>

      {/* Buscador global Cmd+K */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Coach Mental Model (welcome + spotlight) + tour legacy opcional */}
      <MentalModelCoach />
      <AppTour />
      {esSuperAdmin ? <AdminBottomNav /> : null}
    </div>
  )
}
