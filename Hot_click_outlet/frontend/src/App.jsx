import { Suspense, lazy, useEffect, useState, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { ToastProvider } from '@/components/ui/Toast'
import { PageLoader } from '@/components/ui/Spinner'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'
import AccessibilityPanel from '@/components/ui/AccessibilityPanel'
import WhatsAppFab from '@/components/ui/WhatsAppFab'
import AuthPromptModal from '@/components/ui/AuthPromptModal'
import SocialProofToast from '@/components/ui/SocialProofToast'
import { useSocialProof } from '@/hooks/useSocialProof'
import { productService, normalizeProduct } from '@/services/productService'
import { useAbandonedCart } from '@/hooks/useAbandonedCart'
import i18n from './i18n'
import AdminLayout from '@/layouts/AdminLayout'

const HomePage = lazy(() => import('@/pages/HomePage'))
const ProductsPage = lazy(() => import('@/pages/ProductsPage'))
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const NosotrosPage = lazy(() => import('@/pages/NosotrosPage'))
const ContactoPage = lazy(() => import('@/pages/ContactoPage'))
const InformacionPage = lazy(() => import('@/pages/InformacionPage'))

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'))
const AdminWarehouses = lazy(() => import('@/pages/admin/AdminWarehouses'))
const AdminNewSale = lazy(() => import('@/pages/admin/AdminNewSale'))
const AdminFinanzas = lazy(() => import('@/pages/admin/AdminFinanzas'))
const AdminReportes       = lazy(() => import('@/pages/admin/AdminReportes'))
const AdminPublicaciones  = lazy(() => import('@/pages/admin/AdminPublicaciones'))
const AdminNuevoProducto  = lazy(() => import('@/pages/admin/AdminNuevoProducto'))
const AdminPagos          = lazy(() => import('@/pages/admin/AdminPagos'))
const AdminMarcas         = lazy(() => import('@/pages/admin/AdminMarcas'))
const AdminConfiguracion  = lazy(() => import('@/pages/admin/AdminConfiguracion'))
const MisPedidosPage  = lazy(() => import('@/pages/MisPedidosPage'))
const CheckoutPage    = lazy(() => import('@/pages/CheckoutPage'))
const PaymentStatusPage = lazy(() => import('@/pages/PaymentStatusPage'))
const WishlistPage              = lazy(() => import('@/pages/WishlistPage'))
const RecuperarCarritoPage      = lazy(() => import('@/pages/RecuperarCarritoPage'))
const ServiciosHotPage          = lazy(() => import('@/pages/ServiciosHotPage'))
const AdminSolicitudesServicio  = lazy(() => import('@/pages/admin/AdminSolicitudesServicio'))
const AdminSolicitudesGarantia  = lazy(() => import('@/pages/admin/AdminSolicitudesGarantia'))
const AdminTestimonios          = lazy(() => import('@/pages/admin/AdminTestimonios'))
const AdminEmpresas             = lazy(() => import('@/pages/admin/AdminEmpresas'))
const AdminEquipo               = lazy(() => import('@/pages/admin/AdminEquipo'))
const AdminAprobaciones         = lazy(() => import('@/pages/admin/AdminAprobaciones'))
const AdminMiEmpresa            = lazy(() => import('@/pages/admin/AdminMiEmpresa'))
const AdminSecurityCenter       = lazy(() => import('@/pages/admin/AdminSecurityCenter'))
const EmpresaSelectionPage      = lazy(() => import('@/pages/EmpresaSelectionPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function isTokenAlive(token) {
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return isTokenAlive(token) ? children : <Navigate to="/login" replace />
}

class AdminErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) {
    console.error('[AdminErrorBoundary]', error?.message ?? error, info?.componentStack?.slice(0, 300))
  }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: 'var(--hc-bg)' }}>
        <div className="max-w-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <svg className="w-7 h-7" style={{ color: '#f87171' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>Error inesperado</p>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            Algo salió mal en el panel. Si el problema persiste, contactá soporte.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
          >
            Recargar panel
          </button>
        </div>
      </div>
    )
  }
}

function AdminRoute({ children, itOnly = false }) {
  const { token, userRole } = useAuthStore()
  if (!isTokenAlive(token)) return <Navigate to="/login" replace />
  const isAdmin = ['ADMIN_IT', 'ADMIN_CLIENTE', 'EMPRENDEDOR'].includes(userRole)
  if (!isAdmin) return <Navigate to="/" replace />
  if (itOnly && userRole !== 'ADMIN_IT') return <Navigate to="/admin" replace />
  return children
}

function ITOnlyGuard() {
  const userRole = useAuthStore((s) => s.userRole)
  if (userRole !== 'ADMIN_IT') return <Navigate to="/admin" replace />
  return <Outlet />
}

function AdminShell() {
  const { token, userRole } = useAuthStore()
  if (!isTokenAlive(token)) return <Navigate to="/login" replace />
  const isAdmin = ['ADMIN_IT', 'ADMIN_CLIENTE', 'EMPRENDEDOR'].includes(userRole)
  if (!isAdmin) return <Navigate to="/" replace />
  return (
    <AdminErrorBoundary>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </AdminErrorBoundary>
  )
}

const COLOR_FILTERS = {
  none: '',
  grayscale: 'grayscale(100%)',
  deuteranopia: 'url(#filter-deuteranopia)',
  protanopia: 'url(#filter-protanopia)',
  tritanopia: 'url(#filter-tritanopia)',
}

function HtmlClassManager() {
  const { theme, fontSize, highContrast, reduceMotion, language, colorFilter } = useUiStore()

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('dark', 'light')
    html.classList.add(theme)
    html.classList.toggle('fs-lg', fontSize === 'lg')
    html.classList.toggle('fs-xl', fontSize === 'xl')
    html.classList.toggle('high-contrast', highContrast)
    html.classList.toggle('reduce-motion', reduceMotion)
    html.style.filter = COLOR_FILTERS[colorFilter] || ''
  }, [theme, fontSize, highContrast, reduceMotion, colorFilter])

  useEffect(() => {
    i18n.changeLanguage(language)
  }, [language])

  return (
    <svg id="a11y-color-filters" aria-hidden="true" focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <filter id="filter-deuteranopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix type="matrix" values="0.625 0.375 0   0 0
                                               0.7   0.3   0   0 0
                                               0     0.3   0.7 0 0
                                               0     0     0   1 0"/>
        </filter>
        <filter id="filter-protanopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix type="matrix" values="0.567 0.433 0     0 0
                                               0.558 0.442 0     0 0
                                               0     0.242 0.758 0 0
                                               0     0     0     1 0"/>
        </filter>
        <filter id="filter-tritanopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix type="matrix" values="0.95 0.05  0     0 0
                                               0    0.433 0.567 0 0
                                               0    0.475 0.525 0 0
                                               0    0     0     1 0"/>
        </filter>
      </defs>
    </svg>
  )
}

// Excluded paths — social proof / abandoned-cart watcher skip these
const EXCLUDED_PREFIXES = ['/admin', '/checkout', '/pago']

const WAB_HIDDEN_PATHS = ['/login', '/registro', '/carrito']

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function ConditionalWhatsAppFab() {
  const { pathname } = useLocation()
  if (WAB_HIDDEN_PATHS.includes(pathname)) return null
  if (pathname.startsWith('/admin')) return null
  return <WhatsAppFab />
}

// Mounts the abandoned-cart background watcher globally.
// The hook itself bails out if the cart is empty or was recently sent.
function AbandonedCartWatcher() {
  useAbandonedCart()
  return null
}

function SocialProofController() {
  const { pathname } = useLocation()
  const userRole = useAuthStore((s) => s.userRole)
  const [products, setProducts] = useState([])

  const isAdmin    = ['ADMIN_IT', 'ADMIN_CLIENTE', 'EMPRENDEDOR'].includes(userRole)
  const isExcluded = EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (isAdmin || isExcluded) return
    productService.getAll(0, 20)
      .then(({ data }) => {
        const items = (data.content ?? data ?? [])
          .map(normalizeProduct)
          .filter((p) => p.imagenUrl && p.stock > 0)
        setProducts(items)
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const notification = useSocialProof(isAdmin || isExcluded ? [] : products)

  if (isAdmin || isExcluded) return null
  return <SocialProofToast notification={notification} />
}

export default function App() {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <HtmlClassManager />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/productos" element={<ProductsPage />} />
              <Route path="/productos/:id" element={<ProductDetailPage />} />
              <Route path="/carrito" element={<CartPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/seleccionar-negocio" element={<EmpresaSelectionPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/nosotros" element={<NosotrosPage />} />
              <Route path="/contacto" element={<ContactoPage />} />
              <Route path="/informacion" element={<InformacionPage />} />
              <Route path="/perfil"      element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/mis-pedidos" element={<ProtectedRoute><MisPedidosPage /></ProtectedRoute>} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/recuperar-carrito/:id" element={<RecuperarCarritoPage />} />
              <Route path="/servicios" element={<ServiciosHotPage />} />
              <Route path="/pago/exito"     element={<PaymentStatusPage />} />
              <Route path="/pago/cancelado" element={<PaymentStatusPage />} />
              <Route element={<AdminShell />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/productos" element={<AdminProducts />} />
                <Route path="/admin/pedidos" element={<AdminOrders />} />
                <Route path="/admin/categorias" element={<AdminCategories />} />
                <Route path="/admin/bodegas" element={<AdminWarehouses />} />
                <Route path="/admin/ventas" element={<AdminNewSale />} />
                <Route path="/admin/finanzas" element={<AdminFinanzas />} />
                <Route path="/admin/reportes" element={<AdminReportes />} />
                <Route path="/admin/publicaciones" element={<AdminPublicaciones />} />
                <Route path="/admin/nuevo-producto" element={<AdminNuevoProducto />} />
                <Route path="/admin/marcas" element={<AdminMarcas />} />
                <Route path="/admin/configuracion" element={<AdminConfiguracion />} />
                <Route path="/admin/garantias" element={<AdminSolicitudesGarantia />} />
                <Route path="/admin/equipo" element={<AdminEquipo />} />
                <Route path="/admin/mi-empresa" element={<AdminMiEmpresa />} />
                <Route element={<ITOnlyGuard />}>
                  <Route path="/admin/usuarios" element={<AdminUsers />} />
                  <Route path="/admin/pagos" element={<AdminPagos />} />
                  <Route path="/admin/servicios" element={<AdminSolicitudesServicio />} />
                  <Route path="/admin/testimonios" element={<AdminTestimonios />} />
                  <Route path="/admin/empresas" element={<AdminEmpresas />} />
                  <Route path="/admin/aprobaciones" element={<AdminAprobaciones />} />
                  <Route path="/admin/security" element={<AdminSecurityCenter />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <ConditionalWhatsAppFab />
          <AccessibilityPanel />
          <AuthPromptModal />
          <SocialProofController />
          <AbandonedCartWatcher />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
    </HelmetProvider>
  )
}
