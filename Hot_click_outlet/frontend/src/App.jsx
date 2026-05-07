import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/Toast'
import { PageLoader } from '@/components/ui/Spinner'
import useAuthStore from '@/store/authStore'

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
const AdminReportes = lazy(() => import('@/pages/admin/AdminReportes'))

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
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
              <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/productos" element={<AdminRoute><AdminProducts /></AdminRoute>} />
              <Route path="/admin/pedidos" element={<AdminRoute><AdminOrders /></AdminRoute>} />
              <Route path="/admin/usuarios" element={<AdminRoute itOnly><AdminUsers /></AdminRoute>} />
              <Route path="/admin/categorias" element={<AdminRoute><AdminCategories /></AdminRoute>} />
              <Route path="/admin/bodegas" element={<AdminRoute><AdminWarehouses /></AdminRoute>} />
              <Route path="/admin/ventas" element={<AdminRoute><AdminNewSale /></AdminRoute>} />
              <Route path="/admin/finanzas" element={<AdminRoute><AdminFinanzas /></AdminRoute>} />
              <Route path="/admin/reportes" element={<AdminRoute><AdminReportes /></AdminRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
