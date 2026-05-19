import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/Toast'
import { PageLoader } from '@/components/ui/Spinner'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'
import AccessibilityPanel from '@/components/ui/AccessibilityPanel'
import WhatsAppFab from '@/components/ui/WhatsAppFab'
import AuthPromptModal from '@/components/ui/AuthPromptModal'
import i18n from './i18n'

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
const MisPedidosPage  = lazy(() => import('@/pages/MisPedidosPage'))
const CheckoutPage    = lazy(() => import('@/pages/CheckoutPage'))
const PaymentStatusPage = lazy(() => import('@/pages/PaymentStatusPage'))
const WishlistPage    = lazy(() => import('@/pages/WishlistPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children, itOnly = false }) {
  const { token, userRole } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  const isAdmin = ['ADMIN_IT', 'ADMIN_CLIENTE'].includes(userRole)
  if (!isAdmin) return <Navigate to="/" replace />
  if (itOnly && userRole !== 'ADMIN_IT') return <Navigate to="/admin" replace />
  return children
}

function HtmlClassManager() {
  const { theme, fontSize, highContrast, reduceMotion, language } = useUiStore()

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('dark', 'light')
    html.classList.add(theme)
    html.classList.toggle('fs-lg', fontSize === 'lg')
    html.classList.toggle('fs-xl', fontSize === 'xl')
    html.classList.toggle('high-contrast', highContrast)
    html.classList.toggle('reduce-motion', reduceMotion)
  }, [theme, fontSize, highContrast, reduceMotion])

  useEffect(() => {
    i18n.changeLanguage(language)
  }, [language])

  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <HtmlClassManager />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/productos" element={<ProductsPage />} />
              <Route path="/productos/:id" element={<ProductDetailPage />} />
              <Route path="/carrito" element={<CartPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/nosotros" element={<NosotrosPage />} />
              <Route path="/contacto" element={<ContactoPage />} />
              <Route path="/informacion" element={<InformacionPage />} />
              <Route path="/perfil"      element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/mis-pedidos" element={<ProtectedRoute><MisPedidosPage /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/pago/exito"     element={<PaymentStatusPage />} />
              <Route path="/pago/cancelado" element={<PaymentStatusPage />} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/productos" element={<AdminRoute><AdminProducts /></AdminRoute>} />
              <Route path="/admin/pedidos" element={<AdminRoute><AdminOrders /></AdminRoute>} />
              <Route path="/admin/usuarios" element={<AdminRoute itOnly><AdminUsers /></AdminRoute>} />
              <Route path="/admin/categorias" element={<AdminRoute><AdminCategories /></AdminRoute>} />
              <Route path="/admin/bodegas" element={<AdminRoute><AdminWarehouses /></AdminRoute>} />
              <Route path="/admin/ventas" element={<AdminRoute><AdminNewSale /></AdminRoute>} />
              <Route path="/admin/finanzas" element={<AdminRoute><AdminFinanzas /></AdminRoute>} />
              <Route path="/admin/reportes" element={<AdminRoute><AdminReportes /></AdminRoute>} />
              <Route path="/admin/publicaciones" element={<AdminRoute><AdminPublicaciones /></AdminRoute>} />
              <Route path="/admin/nuevo-producto" element={<AdminRoute><AdminNuevoProducto /></AdminRoute>} />
              <Route path="/admin/pagos" element={<AdminRoute><AdminPagos /></AdminRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <WhatsAppFab />
          <AccessibilityPanel />
          <AuthPromptModal />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
