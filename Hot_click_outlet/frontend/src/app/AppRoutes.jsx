import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PlanGate from '@/components/ui/PlanGate'
import {
  ProtectedRoute,
  ITOnlyGuard,
  AdminHomeRoute,
  AdminPedidosRoute,
  AdminReportesRoute,
  AdminPromocionesRoute,
  AdminProductosRoute,
  SistemaProductoFormRoute,
  AdminClientesRoute,
  AdminBlogRoute,
  AdminCopilotRoute,
  RedirectSiSistema,
  AdminShell,
} from '@/app/routeGuards'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
// ClerkShell se carga sólo al navegar a rutas de auth — saca @clerk/react del bundle inicial
const ClerkShell    = CLERK_ENABLED ? lazy(() => import('@/components/auth/ClerkShell')) : null
const SSOCallback   = CLERK_ENABLED ? lazy(() => import('@/pages/SSOCallback')) : null
const SSOComplete   = CLERK_ENABLED ? lazy(() => import('@/pages/SSOComplete')) : null

const HomePage = lazy(() => import('@/pages/HomePage'))
const VisitanteRoutes = lazy(() => import('@/prototipo/visitante/VisitanteRoutes'))
const ProductsPage = lazy(() => import('@/pages/ProductsPage'))
const DescubriPage = lazy(() => import('@/pages/DescubriPage'))
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const NosotrosPage = lazy(() => import('@/pages/NosotrosPage'))
const ContactoPage = lazy(() => import('@/pages/ContactoPage'))
const InformacionPage = lazy(() => import('@/pages/InformacionPage'))
const PrivacidadPage    = lazy(() => import('@/pages/PrivacidadPage'))
const TerminosPage      = lazy(() => import('@/pages/TerminosPage'))
const DevolucionesPage  = lazy(() => import('@/pages/DevolucionesPage'))
const EnviosPage              = lazy(() => import('@/pages/EnviosPage'))
const AcuerdoVendedoresPage   = lazy(() => import('@/pages/AcuerdoVendedoresPage'))
const CookiesPage             = lazy(() => import('@/pages/CookiesPage'))

const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'))
const AdminWarehouses = lazy(() => import('@/pages/admin/AdminWarehouses'))
const AdminNewSale = lazy(() => import('@/pages/admin/AdminNewSale'))
const AdminFinanzas   = lazy(() => import('@/pages/admin/AdminFinanzas'))
const AdminBilletera  = lazy(() => import('@/pages/admin/AdminBilletera'))
const AdminReporteContador = lazy(() => import('@/pages/admin/AdminReporteContador'))
const AdminPublicaciones  = lazy(() => import('@/pages/admin/AdminPublicaciones'))
const AdminNuevoProducto  = lazy(() => import('@/pages/admin/AdminNuevoProducto'))
const AdminCargaMasiva    = lazy(() => import('@/pages/admin/AdminCargaMasiva'))
const AdminImportar       = lazy(() => import('@/pages/admin/AdminImportar'))
const AdminPagos          = lazy(() => import('@/pages/admin/AdminPagos'))
const AdminMarcas         = lazy(() => import('@/pages/admin/AdminMarcas'))
const AdminConfiguracion  = lazy(() => import('@/pages/admin/AdminConfiguracion'))
const MisPedidosPage  = lazy(() => import('@/pages/MisPedidosPage'))
const CheckoutPage    = lazy(() => import('@/pages/CheckoutPage'))
const PaymentStatusPage = lazy(() => import('@/pages/PaymentStatusPage'))
const WishlistPage              = lazy(() => import('@/pages/WishlistPage'))
const RecuperarCarritoPage      = lazy(() => import('@/pages/RecuperarCarritoPage'))
const ServiciosHotPage          = lazy(() => import('@/pages/ServiciosHotPage'))
const NotFoundPage              = lazy(() => import('@/pages/NotFoundPage'))
const AdminSolicitudesServicio  = lazy(() => import('@/pages/admin/AdminSolicitudesServicio'))
const AdminSolicitudesGarantia  = lazy(() => import('@/pages/admin/AdminSolicitudesGarantia'))
const AdminTestimonios          = lazy(() => import('@/pages/admin/AdminTestimonios'))
const AdminEmpresas             = lazy(() => import('@/pages/admin/AdminEmpresas'))
const AdminEquipo               = lazy(() => import('@/pages/admin/AdminEquipo'))
const AdminAprobaciones         = lazy(() => import('@/pages/admin/AdminAprobaciones'))
const AdminMiEmpresa            = lazy(() => import('@/pages/admin/AdminMiEmpresa'))
const AdminSecurityCenter       = lazy(() => import('@/pages/admin/AdminSecurityCenter'))
const AdminSuperAdmin           = lazy(() => import('@/pages/admin/AdminSuperAdmin'))
const AdminObservabilidad       = lazy(() => import('@/pages/admin/AdminObservabilidad'))
const AdminCotizaciones         = lazy(() => import('@/pages/admin/AdminCotizaciones'))
const AdminNuevaCotizacion      = lazy(() => import('@/pages/admin/AdminNuevaCotizacion'))
const CotizacionPublicaPage     = lazy(() => import('@/pages/CotizacionPublicaPage'))
const AdminAiControl            = lazy(() => import('@/pages/admin/AdminAiControl'))
const AdminFacturas             = lazy(() => import('@/pages/admin/AdminFacturas'))
const AdminConfigFiscal         = lazy(() => import('@/pages/admin/AdminConfigFiscal'))
const EmpresaSelectionPage      = lazy(() => import('@/pages/EmpresaSelectionPage'))
const BlogPage                  = lazy(() => import('@/pages/BlogPage'))
const BlogPostPage               = lazy(() => import('@/pages/BlogPostPage'))
const EmprendimientosPage       = lazy(() => import('@/pages/EmprendimientosPage'))
const EmprendePage              = lazy(() => import('@/pages/EmprendePage'))
const AdminConvenios            = lazy(() => import('@/pages/admin/AdminConvenios'))
const AdminPOS                  = lazy(() => import('@/pages/admin/pos/AdminPOS'))
const AdminPOSCaja              = lazy(() => import('@/pages/admin/pos/AdminPOSCaja'))
const AdminPOSHistorial         = lazy(() => import('@/pages/admin/pos/AdminPOSHistorial'))
const ModeSelector              = lazy(() => import('@/pages/auth/ModeSelector'))
const AdminCompras              = lazy(() => import('@/pages/admin/AdminCompras'))
const AdminNuevaCompra          = lazy(() => import('@/pages/admin/AdminNuevaCompra'))
const AdminProveedores          = lazy(() => import('@/pages/admin/AdminProveedores'))
const AdminPlanes               = lazy(() => import('@/pages/admin/AdminPlanes'))
const AdminSuscripcion          = lazy(() => import('@/pages/admin/AdminSuscripcion'))
const AdminOfflineCola          = lazy(() => import('@/pages/admin/AdminOfflineCola'))
// const AdminMesas                = lazy(() => import('@/pages/admin/AdminMesas'))  // futuro
const AdminGiftCards            = lazy(() => import('@/pages/admin/AdminGiftCards'))
const AdminAsignarProducto      = lazy(() => import('@/pages/admin/AdminAsignarProducto'))
const AdminCupones              = lazy(() => import('@/pages/admin/AdminCupones'))
const AdminBranding             = lazy(() => import('@/pages/admin/AdminBranding'))
const AdminHomepage             = lazy(() => import('@/pages/admin/AdminHomepage'))
const AdminPlugins              = lazy(() => import('@/pages/admin/AdminPlugins'))
const AdminInventario           = lazy(() => import('@/pages/admin/AdminInventario'))
const AdminAyuda                = lazy(() => import('@/pages/admin/AdminAyuda'))
const AdminForecast             = lazy(() => import('@/pages/admin/AdminForecast'))
const AdminExecutive            = lazy(() => import('@/pages/admin/AdminExecutive'))
const AdminMultipais            = lazy(() => import('@/pages/admin/AdminMultipais'))
// const SelfCheckoutPage          = lazy(() => import('@/pages/SelfCheckoutPage'))  // futuro (QR mesas)
const POSPagoPage               = lazy(() => import('@/pages/pos/POSPagoPage'))
const RegistrarNegocioPage      = lazy(() => import('@/pages/RegistrarNegocioPage'))
const RegistroEmpresaPage       = lazy(() => import('@/pages/RegistroEmpresaPage'))

// ── Tienda pública por slug (/tienda/{slug}/...) ─────────────────────────────
const TiendaLayout       = lazy(() => import('@/pages/tienda/TiendaLayout'))
const TiendaHomePage     = lazy(() => import('@/pages/tienda/TiendaHomePage'))
const TiendaProductoPage = lazy(() => import('@/pages/tienda/TiendaProductoPage'))
const TiendaCarritoPage  = lazy(() => import('@/pages/tienda/TiendaCarritoPage'))
const TiendaCheckoutPage = lazy(() => import('@/pages/tienda/TiendaCheckoutPage'))
const TiendaSuccessPage  = lazy(() => import('@/pages/tienda/TiendaSuccessPage'))

/**
 * Árbol `<Routes>` de HotClick. Mismos paths, elements, lazy y anidación
 * que el App.jsx original.
 */
export default function AppRoutes() {
  return (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/prototipo/visitante/*" element={<VisitanteRoutes />} />
              <Route path="/productos" element={<ProductsPage />} />
              <Route path="/descubri" element={<DescubriPage />} />
              <Route path="/productos/:id" element={<ProductDetailPage />} />
              <Route path="/carrito" element={<CartPage />} />
              {/* Rutas de auth: ClerkShell se lazy-carga aquí, no en el bundle inicial */}
              {CLERK_ENABLED ? (
                <Route element={<ClerkShell />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/registro" element={<RegisterPage />} />
                  <Route path="/sso-callback" element={<SSOCallback />} />
                  <Route path="/sso-complete" element={<SSOComplete />} />
                </Route>
              ) : (
                <>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/registro" element={<RegisterPage />} />
                </>
              )}
              <Route path="/registro-empresa" element={<RegistroEmpresaPage />} />
              <Route path="/registrar-negocio" element={<ProtectedRoute><RegistrarNegocioPage /></ProtectedRoute>} />
              <Route path="/mode-select" element={<ModeSelector />} />
              <Route path="/seleccionar-negocio" element={<EmpresaSelectionPage />} />
              <Route path="/nosotros" element={<NosotrosPage />} />
              <Route path="/contacto" element={<ContactoPage />} />
              <Route path="/informacion" element={<InformacionPage />} />
              <Route path="/privacidad"   element={<PrivacidadPage />} />
              <Route path="/terminos"    element={<TerminosPage />} />
              <Route path="/devoluciones" element={<DevolucionesPage />} />
              <Route path="/envios"              element={<EnviosPage />} />
              <Route path="/acuerdo-vendedores" element={<AcuerdoVendedoresPage />} />
              <Route path="/cookies"            element={<CookiesPage />} />
              <Route path="/perfil"      element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/mis-pedidos" element={<ProtectedRoute><MisPedidosPage /></ProtectedRoute>} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/recuperar-carrito/:id" element={<RecuperarCarritoPage />} />
              <Route path="/cotizacion/:token" element={<CotizacionPublicaPage />} />
              <Route path="/servicios" element={<ServiciosHotPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/emprende" element={<EmprendePage />} />
              <Route path="/emprendimientos" element={<EmprendimientosPage />} />
              <Route path="/pago/exito"     element={<PaymentStatusPage />} />
              <Route path="/pago/cancelado" element={<PaymentStatusPage />} />
              <Route element={<AdminShell />}>
                <Route path="/admin" element={<AdminHomeRoute />} />
                <Route path="/admin/productos" element={<AdminProductosRoute />} />
                <Route path="/admin/productos/nuevo" element={<SistemaProductoFormRoute />} />
                <Route path="/admin/productos/:id/editar" element={<SistemaProductoFormRoute />} />
                <Route path="/admin/pedidos" element={<AdminPedidosRoute />} />
                <Route path="/admin/bodegas" element={<RedirectSiSistema to="/admin/configuracion?seccion=bodega"><AdminWarehouses /></RedirectSiSistema>} />
                <Route path="/admin/ventas" element={<RedirectSiSistema to="/admin/pedidos"><AdminNewSale /></RedirectSiSistema>} />
                <Route path="/admin/clientes" element={<AdminClientesRoute />} />
                <Route path="/admin/finanzas" element={<RedirectSiSistema to="/admin/reportes"><AdminFinanzas /></RedirectSiSistema>} />
                <Route path="/admin/finanzas/reporte-contador" element={<RedirectSiSistema to="/admin/reportes"><AdminReporteContador /></RedirectSiSistema>} />
                <Route path="/admin/billetera" element={<RedirectSiSistema to="/admin/reportes"><AdminBilletera /></RedirectSiSistema>} />
                <Route path="/admin/reportes" element={<AdminReportesRoute />} />
                <Route path="/admin/nuevo-producto" element={<RedirectSiSistema to="/admin/productos/nuevo"><AdminNuevoProducto /></RedirectSiSistema>} />
                <Route path="/admin/productos/carga-masiva" element={<RedirectSiSistema to="/admin/productos"><AdminCargaMasiva /></RedirectSiSistema>} />
                <Route path="/admin/productos/importar" element={<RedirectSiSistema to="/admin/productos"><AdminImportar /></RedirectSiSistema>} />
                <Route path="/admin/marcas" element={<RedirectSiSistema to="/admin/configuracion?seccion=marca"><AdminMarcas /></RedirectSiSistema>} />
                <Route path="/admin/configuracion" element={<AdminConfiguracion />} />
                <Route path="/admin/garantias" element={<RedirectSiSistema to="/admin/ayuda"><AdminSolicitudesGarantia /></RedirectSiSistema>} />
                <Route path="/admin/equipo" element={<RedirectSiSistema to="/admin/configuracion"><AdminEquipo /></RedirectSiSistema>} />
                <Route path="/admin/mi-empresa" element={<RedirectSiSistema to="/admin/configuracion?seccion=marca"><AdminMiEmpresa /></RedirectSiSistema>} />
                {/* Solo ADMIN (superadmin de la plataforma) — no son por-empresa */}
                <Route element={<ITOnlyGuard />}>
                  <Route path="/admin/categorias" element={<AdminCategories />} />
                  <Route path="/admin/cotizaciones" element={<AdminCotizaciones />} />
                  <Route path="/admin/cotizaciones/nueva" element={<AdminNuevaCotizacion />} />
                  <Route path="/admin/cotizaciones/:id" element={<AdminNuevaCotizacion />} />
                  <Route path="/admin/usuarios" element={<AdminUsers />} />
                  <Route path="/admin/pagos" element={<AdminPagos />} />
                  <Route path="/admin/servicios" element={<AdminSolicitudesServicio />} />
                  <Route path="/admin/testimonios" element={<AdminTestimonios />} />
                  <Route path="/admin/empresas" element={<AdminEmpresas />} />
                  <Route path="/admin/aprobaciones" element={<AdminAprobaciones />} />
                  <Route path="/admin/security"    element={<AdminSecurityCenter />} />
                  <Route path="/admin/superadmin"      element={<AdminSuperAdmin />} />
                  <Route path="/admin/observabilidad" element={<AdminObservabilidad />} />
                  <Route path="/admin/ai-control"   element={<AdminAiControl />} />
                  <Route path="/admin/facturas"     element={<AdminFacturas />} />
                  <Route path="/admin/config-fiscal" element={<AdminConfigFiscal />} />
                  {/* <Route path="/admin/mesas"               element={<AdminMesas />} /> */}{/* futuro */}
                  <Route path="/admin/homepage"           element={<AdminHomepage />} />
                  <Route path="/admin/cupones"            element={<AdminCupones />} />
                  <Route path="/admin/publicaciones" element={<AdminPublicaciones />} />
                  <Route path="/admin/branding"            element={<AdminBranding />} />
                  <Route path="/admin/plugins"             element={<AdminPlugins />} />
                  <Route path="/admin/multipais"           element={<AdminMultipais />} />
                  <Route path="/admin/convenios"     element={<AdminConvenios />} />
                </Route>
                {/* ADMIN + EMPRENDEDOR (por-empresa) — algunas requieren plan PYME/NEGOCIO_PLUS */}
                <Route path="/admin/planes"              element={<Navigate to="/admin/billing/planes" replace />} />
                <Route path="/admin/billing/planes"      element={<AdminPlanes />} />
                <Route path="/admin/billing/suscripcion" element={<AdminSuscripcion />} />
                <Route path="/admin/offline/cola"        element={<RedirectSiSistema to="/admin"><AdminOfflineCola /></RedirectSiSistema>} />
                <Route path="/admin/gift-cards"          element={<RedirectSiSistema to="/admin"><AdminGiftCards /></RedirectSiSistema>} />
                <Route path="/admin/inventario"          element={<RedirectSiSistema to="/admin/copilot"><PlanGate feature="ai" planRequerido="PYME"><AdminInventario /></PlanGate></RedirectSiSistema>} />
                <Route path="/admin/copilot"             element={<AdminCopilotRoute />} />
                <Route path="/admin/ayuda"               element={<AdminAyuda />} />
                <Route path="/admin/forecast"            element={<RedirectSiSistema to="/admin/copilot"><PlanGate feature="ai" planRequerido="PYME"><AdminForecast /></PlanGate></RedirectSiSistema>} />
                <Route path="/admin/executive"           element={<RedirectSiSistema to="/admin/reportes"><PlanGate feature="reportes" planRequerido="PYME"><AdminExecutive /></PlanGate></RedirectSiSistema>} />
                <Route path="/admin/asignar-compra" element={<RedirectSiSistema to="/admin/pedidos"><AdminAsignarProducto /></RedirectSiSistema>} />
                <Route path="/admin/ofertas"       element={<AdminPromocionesRoute />} />
                <Route path="/admin/blog"          element={<AdminBlogRoute />} />
                {/* El POS está disponible para todos los planes (decisión de
                    negocio jul 2026) — sin PlanGate. AdminShell ya valida
                    token y rol antes de llegar acá. */}
                <Route path="/admin/pos"           element={<AdminPOS />} />
                <Route path="/admin/pos/caja"      element={<AdminPOSCaja />} />
                <Route path="/admin/pos/historial" element={<AdminPOSHistorial />} />
                <Route path="/admin/compras"        element={<RedirectSiSistema to="/admin/configuracion"><PlanGate feature="compras" planRequerido="PYME"><AdminCompras /></PlanGate></RedirectSiSistema>} />
                <Route path="/admin/compras/nueva"  element={<RedirectSiSistema to="/admin/configuracion"><PlanGate feature="compras" planRequerido="PYME"><AdminNuevaCompra /></PlanGate></RedirectSiSistema>} />
                <Route path="/admin/proveedores"    element={<RedirectSiSistema to="/admin/configuracion"><AdminProveedores /></RedirectSiSistema>} />
              </Route>
              {/* Self-checkout QR — futuro (comentado)
              <Route path="/checkout/qr/:token" element={<SelfCheckoutPage />} />
              */}
              {/* POS QR pago — página pública para el cliente */}
              <Route path="/pos/pago/:token" element={<POSPagoPage />} />
              {/* Tienda pública por slug — layout y rutas completamente independientes */}
              <Route path="/tienda/:slug" element={<TiendaLayout />}>
                <Route index element={<TiendaHomePage />} />
                <Route path="producto/:productoId" element={<TiendaProductoPage />} />
                <Route path="carrito"  element={<TiendaCarritoPage />} />
                <Route path="checkout" element={<TiendaCheckoutPage />} />
                <Route path="checkout/exito" element={<TiendaSuccessPage />} />
              </Route>
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
  )
}
