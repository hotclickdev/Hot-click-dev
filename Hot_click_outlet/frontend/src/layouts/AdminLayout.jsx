import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import useAuthStore from '@/store/authStore'

const sidebarLinks = [
  { to: '/admin', label: 'General', icon: <HomeIcon />, exact: true },
  { to: '/admin/productos', label: 'Productos', icon: <BoxIcon /> },
  { to: '/admin/pedidos', label: 'Pedidos', icon: <ClipboardIcon /> },
  { to: '/admin/usuarios', label: 'Usuarios', icon: <UsersIcon /> },
  { to: '/admin/categorias', label: 'Categorías', icon: <TagIcon /> },
  { to: '/admin/bodegas', label: 'Bodegas', icon: <BuildingIcon /> },
  { to: '/admin/ventas', label: 'Nueva Venta', icon: <PlusCircleIcon /> },
  { to: '/admin/finanzas', label: 'Finanzas', icon: <ChartIcon /> },
  { to: '/admin/reportes', label: 'Reportes', icon: <BarIcon /> },
  { to: '/admin/publicaciones', label: 'Publicar FB', icon: <ShareIcon /> },
]

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { userName, logout, isAdminIT } = useAuthStore()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  // Cierra el drawer al navegar
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#4f7cff] flex items-center justify-center shadow-[0_0_12px_rgba(79,124,255,0.4)] shrink-0">
            <span className="text-white font-extrabold text-[11px] tracking-tight leading-none">HC</span>
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight leading-none">
              <span className="text-white">HOT</span><span className="text-[#4f7cff]">CLICK</span>
            </div>
            <div className="text-[10px] text-[#8e8e9a] mt-0.5">Panel Admin</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {sidebarLinks.map((link) => {
          if (link.to === '/admin/usuarios' && !isAdminIT()) return null
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150
                ${isActive
                  ? 'bg-[#4f7cff]/15 text-white border border-[#4f7cff]/20'
                  : 'text-[#8e8e9a] hover:text-white hover:bg-white/5'
                }
              `}
            >
              <span className="w-4 h-4 flex items-center justify-center shrink-0">{link.icon}</span>
              {link.label}
            </NavLink>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/8 space-y-1 shrink-0">
        <NavLink
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors"
        >
          ← Ir a la tienda
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#8e8e9a] hover:text-red-400 hover:bg-red-500/5 transition-colors text-left"
        >
          Cerrar sesión
        </button>
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-xs font-semibold text-[#4f7cff]">
            {userName?.[0]?.toUpperCase() || 'A'}
          </div>
          <span className="text-xs text-[#8e8e9a] truncate">{userName || 'Admin'}</span>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0b]">

      {/* ── Desktop sidebar ── */}
      <aside className="w-60 shrink-0 border-r border-white/8 bg-[#0a0a0b] flex-col fixed inset-y-0 left-0 z-20 hidden md:flex">
        <SidebarContent />
      </aside>

      {/* ── Mobile: top header bar ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-[#0a0a0b]/95 backdrop-blur-xl border-b border-white/8 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4f7cff] flex items-center justify-center shrink-0">
            <span className="text-white font-extrabold text-[11px]">HC</span>
          </div>
          <div className="font-extrabold text-sm">
            <span className="text-white">HOT</span><span className="text-[#4f7cff]">CLICK</span>
          </div>
          <span className="text-[10px] text-[#8e8e9a]">Admin</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 text-[#8e8e9a] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Menú admin"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </header>

      {/* ── Mobile: slide-in drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0b] border-r border-white/8 flex flex-col md:hidden"
            >
              {/* Close button */}
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-3 right-3 p-1.5 text-[#8e8e9a] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <div className="md:ml-60">
        <motion.main
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-screen px-4 py-4 pt-[66px] md:pt-6 md:px-6 lg:px-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}

const ic = 'w-4 h-4'
const s = { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

function HomeIcon() {
  return <svg className={ic} {...s}><path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/><path d="M3 12v9h18v-9"/></svg>
}
function BoxIcon() {
  return <svg className={ic} {...s}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
}
function ClipboardIcon() {
  return <svg className={ic} {...s}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
}
function UsersIcon() {
  return <svg className={ic} {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}
function TagIcon() {
  return <svg className={ic} {...s}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
}
function BuildingIcon() {
  return <svg className={ic} {...s}><rect x="2" y="7" width="20" height="14" rx="1"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
}
function PlusCircleIcon() {
  return <svg className={ic} {...s}><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
}
function ChartIcon() {
  return <svg className={ic} {...s}><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
}
function BarIcon() {
  return <svg className={ic} {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
}
function ShareIcon() {
  return <svg className={ic} {...s}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
}
