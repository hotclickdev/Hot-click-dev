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
  RedirectTiendaAEmpresa,
} from '@/app/routeGuards'
import AdminRoleSwitch from '@/app/AdminRoleSwitch'
import PrototipoRedirect from '@/app/PrototipoRedirect'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const ClerkShell = CLERK_ENABLED ? lazy(() => import('@/components/auth/ClerkShell')) : null
const SSOCallback = CLERK_ENABLED ? lazy(() => import('@/pages/SSOCallback')) : null
const SSOComplete = CLERK_ENABLED ? lazy(() => import('@/pages/SSOComplete')) : null

const HomePage = lazy(() => import('@/pages/HomePage'))
const VisitanteRoutes = lazy(() => import('@/prototipo/visitante/VisitanteRoutes'))
const EmprendedorArea = lazy(() => import('@/app/FigmaSellerGate').then((m) => ({ default: m.EmprendedorArea })))
const PymeArea = lazy(() => import('@/app/FigmaSellerGate').then((m) => ({ default: m.PymeArea })))
const NegocioPlusArea = lazy(() => import('@/app/FigmaSellerGate').then((m) => ({ default: m.NegocioPlusArea })))
const ProductsPage = lazy(() => import('@/pages/ProductsPage'))
const DescubriPage = lazy(() => import('@/pages/DescubriPage'))
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const MisPedidosPage = lazy(() => import('@/pages/MisPedidosPage'))
const WishlistPage = lazy(() => import('@/pages/WishlistPage'))

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const NosotrosPage = lazy(() => import('@/pages/NosotrosPage'))
const ContactoPage = lazy(() => import('@/pages/ContactoPage'))
const InformacionPage = lazy(() => import('@/pages/InformacionPage'))
const PrivacidadPage = lazy(() => import('@/pages/PrivacidadPage'))
const TerminosPage = lazy(() => import('@/pages/TerminosPage'))
const DevolucionesPage = lazy(() => import('@/pages/DevolucionesPage'))
const EnviosPage = lazy(() => import('@/pages/EnviosPage'))
const AcuerdoVendedoresPage = lazy(() => import('@/pages/AcuerdoVendedoresPage'))
const CookiesPage = lazy(() => import('@/pages/CookiesPage'))

const AdminWarehouses = lazy(() => import('@/pages/admin/AdminWarehouses'))
const AdminNewSale = lazy(() => import('@/pages/admin/AdminNewSale'))
const AdminFinanzas = lazy(() => import('@/pages/admin/AdminFinanzas'))
const AdminBilletera = lazy(() => import('@/pages/admin/AdminBilletera'))
const AdminReporteContador = lazy(() => import('@/pages/admin/AdminReporteContador'))
const AdminPublicaciones = lazy(() => import('@/pages/admin/AdminPublicaciones'))
const AdminNuevoProducto = lazy(() => import('@/pages/admin/AdminNuevoProducto'))
const AdminCargaMasiva = lazy(() => import('@/pages/admin/AdminCargaMasiva'))
const AdminImportar = lazy(() => import('@/pages/admin/AdminImportar'))
const AdminPagos = lazy(() => import('@/pages/admin/AdminPagos'))
const AdminMarcas = lazy(() => import('@/pages/admin/AdminMarcas'))
const AdminConfiguracion = lazy(() => import('@/pages/admin/AdminConfiguracion'))
const AdminMasHerramientas = lazy(() => import('@/pages/admin/AdminMasHerramientas'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const PaymentStatusPage = lazy(() => import('@/pages/PaymentStatusPage'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const RecuperarCarritoPage = lazy(() => import('@/pages/RecuperarCarritoPage'))
const ServiciosHotPage = lazy(() => import('@/pages/ServiciosHotPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const AdminSolicitudesServicio = lazy(() => import('@/pages/admin/AdminSolicitudesServicio'))
const AdminSolicitudesGarantia = lazy(() => import('@/pages/admin/AdminSolicitudesGarantia'))
const AdminEmpresas = lazy(() => import('@/pages/admin/AdminEmpresas'))
const AdminEmpresaWorkspace = lazy(() => import('@/pages/admin/AdminEmpresaWorkspace'))
const AdminEquipo = lazy(() => import('@/pages/admin/AdminEquipo'))
const AdminAprobaciones = lazy(() => import('@/pages/admin/AdminAprobaciones'))
const AdminMiEmpresa = lazy(() => import('@/pages/admin/AdminMiEmpresa'))
const AdminSecurityCenter = lazy(() => import('@/pages/admin/AdminSecurityCenter'))
const AdminSuperAdmin = lazy(() => import('@/pages/admin/AdminSuperAdmin'))
const AdminObservabilidad = lazy(() => import('@/pages/admin/AdminObservabilidad'))
const AdminAuditorias = lazy(() => import('@/pages/admin/AdminAuditorias'))
const AdminCotizaciones = lazy(() => import('@/pages/admin/AdminCotizaciones'))
const AdminNuevaCotizacion = lazy(() => import('@/pages/admin/AdminNuevaCotizacion'))
const CotizacionPublicaPage = lazy(() => import('@/pages/CotizacionPublicaPage'))
const EncargoPublicPage = lazy(() => import('@/pages/EncargoPublicPage'))
const AdminEncargos = lazy(() => import('@/pages/admin/AdminEncargos'))
const AdminRecolecciones = lazy(() => import('@/pages/admin/AdminRecolecciones'))
const AdminPayouts = lazy(() => import('@/pages/admin/AdminPayouts'))
const AdminReportesProducto = lazy(() => import('@/pages/admin/AdminReportesProducto'))
const AdminSoporteTickets = lazy(() => import('@/pages/admin/AdminSoporteTickets'))
const AdminAiControl = lazy(() => import('@/pages/admin/AdminAiControl'))
const AdminFacturas = lazy(() => import('@/pages/admin/AdminFacturas'))
const AdminConfigFiscal = lazy(() => import('@/pages/admin/AdminConfigFiscal'))
const EmpresaSelectionPage = lazy(() => import('@/pages/EmpresaSelectionPage'))
const BlogPage = lazy(() => import('@/pages/BlogPage'))
const BlogPostPage = lazy(() => import('@/pages/BlogPostPage'))
const EmprendimientosPage = lazy(() => import('@/pages/EmprendimientosPage'))
const EmprendePage = lazy(() => import('@/pages/EmprendePage'))
const AdminPOS = lazy(() => import('@/pages/admin/pos/AdminPOS'))
const AdminPOSCaja = lazy(() => import('@/pages/admin/pos/AdminPOSCaja'))
const AdminPOSHistorial = lazy(() => import('@/pages/admin/pos/AdminPOSHistorial'))
const ModeSelector = lazy(() => import('@/pages/auth/ModeSelector'))
const AdminCompras = lazy(() => import('@/pages/admin/AdminCompras'))
const AdminNuevaCompra = lazy(() => import('@/pages/admin/AdminNuevaCompra'))
const AdminProveedores = lazy(() => import('@/pages/admin/AdminProveedores'))
const AdminPlanes = lazy(() => import('@/pages/admin/AdminPlanes'))
const AdminSuscripcion = lazy(() => import('@/pages/admin/AdminSuscripcion'))
const AdminOfflineCola = lazy(() => import('@/pages/admin/AdminOfflineCola'))
const AdminGiftCards = lazy(() => import('@/pages/admin/AdminGiftCards'))
const AdminAsignarProducto = lazy(() => import('@/pages/admin/AdminAsignarProducto'))
const AdminCupones = lazy(() => import('@/pages/admin/AdminCupones'))
const AdminHomepage = lazy(() => import('@/pages/admin/AdminHomepage'))
const AdminInventario = lazy(() => import('@/pages/admin/AdminInventario'))
const AdminAyuda = lazy(() => import('@/pages/admin/AdminAyuda'))
const AdminForecast = lazy(() => import('@/pages/admin/AdminForecast'))
const AdminExecutive = lazy(() => import('@/pages/admin/AdminExecutive'))
const AdminMultipais = lazy(() => import('@/pages/admin/AdminMultipais'))
const POSPagoPage = lazy(() => import('@/pages/pos/POSPagoPage'))
const RegistrarNegocioPage = lazy(() => import('@/pages/RegistrarNegocioPage'))
const RegistroEmpresaPage = lazy(() => import('@/pages/RegistroEmpresaPage'))
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'))

const TiendaLayout = lazy(() => import('@/pages/tienda/TiendaLayout'))
const TiendaHomePage = lazy(() => import('@/pages/tienda/TiendaHomePage'))
const TiendaProductoPage = lazy(() => import('@/pages/tienda/TiendaProductoPage'))
const TiendaCarritoPage = lazy(() => import('@/pages/tienda/TiendaCarritoPage'))
const TiendaCheckoutPage = lazy(() => import('@/pages/tienda/TiendaCheckoutPage'))
const TiendaSuccessPage = lazy(() => import('@/pages/tienda/TiendaSuccessPage'))

/**
 * Home `/` = marketplace de producción (Compra · Vende · Emprende).
 * Figma Visitante vive en `/visitante/*`. `/prototipo/*` redirige a prefijos por rol.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/visitante/*" element={<VisitanteRoutes />} />
      <Route path="/emprendedor/*" element={<EmprendedorArea />} />
      <Route path="/pyme/*" element={<PymeArea />} />
      <Route path="/negocio-plus/*" element={<NegocioPlusArea />} />
      <Route path="/prototipo" element={<PrototipoRedirect />} />
      <Route path="/prototipo/*" element={<PrototipoRedirect />} />
      <Route path="/productos" element={<ProductsPage />} />
      <Route path="/descubri" element={<DescubriPage />} />
      <Route path="/productos/:id" element={<ProductDetailPage />} />
      <Route path="/carrito" element={<CartPage />} />
      <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/mis-pedidos" element={<ProtectedRoute><MisPedidosPage /></ProtectedRoute>} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
      <Route path="/pago/exito" element={<PaymentStatusPage />} />
      <Route path="/pago/cancelado" element={<PaymentStatusPage />} />

      {CLERK_ENABLED && ClerkShell && SSOCallback && SSOComplete ? (
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
      <Route path="/privacidad" element={<PrivacidadPage />} />
      <Route path="/terminos" element={<TerminosPage />} />
      <Route path="/devoluciones" element={<DevolucionesPage />} />
      <Route path="/envios" element={<EnviosPage />} />
      <Route path="/acuerdo-vendedores" element={<AcuerdoVendedoresPage />} />
      <Route path="/cookies" element={<CookiesPage />} />
      <Route path="/recuperar-carrito/:token" element={<RecuperarCarritoPage />} />
      <Route path="/cotizacion/:token" element={<CotizacionPublicaPage />} />
      <Route path="/encargo/:token" element={<EncargoPublicPage />} />
      <Route path="/servicios" element={<ServiciosHotPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/emprende" element={<EmprendePage />} />
      <Route path="/emprendimientos" element={<EmprendimientosPage />} />

      <Route path="/admin/*" element={<AdminRoleSwitch />}>
        <Route index element={<AdminHomeRoute />} />
        <Route path="dashboard" element={<Navigate to="/admin" replace />} />
        <Route path="tiendas" element={<Navigate to="/admin/empresas" replace />} />
        <Route path="tiendas/:id" element={<RedirectTiendaAEmpresa />} />
        <Route path="tiendas/:id/preview" element={<Navigate to="/admin/empresas" replace />} />
        <Route path="tiendas/:id/suspender" element={<Navigate to="/admin/empresas" replace />} />
        <Route path="moderacion" element={<Navigate to="/admin/aprobaciones" replace />} />
        <Route path="moderacion/aprobado" element={<Navigate to="/admin/aprobaciones" replace />} />
        <Route path="moderacion/rechazar" element={<Navigate to="/admin/aprobaciones" replace />} />
        <Route path="config" element={<Navigate to="/admin/configuracion" replace />} />
        <Route path="config/categorias" element={<Navigate to="/admin/categorias" replace />} />
        <Route path="config/categorias/nueva" element={<Navigate to="/admin/categorias" replace />} />
        <Route path="config/politica" element={<Navigate to="/admin/configuracion" replace />} />
        <Route path="config/pagos" element={<Navigate to="/admin/pagos" replace />} />
        <Route path="config/notificaciones" element={<Navigate to="/admin/configuracion" replace />} />
        <Route path="cerrar-sesion" element={<Navigate to="/admin" replace />} />
        <Route path="carga-masiva" element={<Navigate to="/admin/productos/carga-masiva" replace />} />
        <Route path="carga-masiva/revisar" element={<Navigate to="/admin/productos/carga-masiva" replace />} />
        <Route path="carga-masiva/completada" element={<Navigate to="/admin/productos" replace />} />
        <Route path="herramientas" element={<AdminMasHerramientas />} />
        <Route path="herramientas/marcas" element={<Navigate to="/admin/marcas" replace />} />
        <Route path="herramientas/garantias" element={<Navigate to="/admin/garantias" replace />} />
        <Route path="herramientas/clientes" element={<Navigate to="/admin/clientes" replace />} />
        <Route path="herramientas/auditorias" element={<Navigate to="/admin/auditorias" replace />} />
        <Route path="herramientas/servicios" element={<Navigate to="/admin/servicios" replace />} />
        <Route path="herramientas/aprobaciones" element={<Navigate to="/admin/aprobaciones" replace />} />
        <Route path="proximamente" element={<Navigate to="/admin" replace />} />
        <Route path="productos" element={<AdminProductosRoute />} />
        <Route path="productos/nuevo" element={<SistemaProductoFormRoute />} />
        <Route path="productos/:id/editar" element={<SistemaProductoFormRoute />} />
        <Route path="pedidos" element={<AdminPedidosRoute />} />
        <Route path="encargos" element={<AdminEncargos />} />
        <Route path="bodegas" element={<RedirectSiSistema to="/admin/configuracion?seccion=bodega"><AdminWarehouses /></RedirectSiSistema>} />
        <Route path="ventas" element={<RedirectSiSistema to="/admin/pedidos"><AdminNewSale /></RedirectSiSistema>} />
        <Route path="clientes" element={<AdminClientesRoute />} />
        <Route path="finanzas" element={<RedirectSiSistema to="/admin/reportes"><AdminFinanzas /></RedirectSiSistema>} />
        <Route path="finanzas/reporte-contador" element={<RedirectSiSistema to="/admin/reportes"><AdminReporteContador /></RedirectSiSistema>} />
        <Route path="billetera" element={<RedirectSiSistema to="/admin/reportes"><AdminBilletera /></RedirectSiSistema>} />
        <Route path="reportes" element={<AdminReportesRoute />} />
        <Route path="nuevo-producto" element={<RedirectSiSistema to="/admin/productos/nuevo"><AdminNuevoProducto /></RedirectSiSistema>} />
        <Route path="productos/carga-masiva" element={<RedirectSiSistema to="/admin/productos"><AdminCargaMasiva /></RedirectSiSistema>} />
        <Route path="productos/importar" element={<RedirectSiSistema to="/admin/productos"><AdminImportar /></RedirectSiSistema>} />
        <Route path="marcas" element={<RedirectSiSistema to="/admin/configuracion?seccion=marca"><AdminMarcas /></RedirectSiSistema>} />
        <Route path="configuracion" element={<AdminConfiguracion />} />
        <Route path="garantias" element={<RedirectSiSistema to="/admin/ayuda"><AdminSolicitudesGarantia /></RedirectSiSistema>} />
        <Route path="equipo" element={<RedirectSiSistema to="/admin/configuracion"><AdminEquipo /></RedirectSiSistema>} />
        <Route path="mi-empresa" element={<RedirectSiSistema to="/admin/configuracion?seccion=marca"><AdminMiEmpresa /></RedirectSiSistema>} />
        <Route path="categorias" element={<AdminCategories />} />
        <Route path="tienda" element={<Navigate to="/admin" replace />} />
        <Route path="tienda/*" element={<Navigate to="/admin" replace />} />
        <Route path="opciones" element={<Navigate to="/admin/configuracion" replace />} />
        <Route path="opciones/*" element={<Navigate to="/admin/configuracion" replace />} />
        <Route element={<ITOnlyGuard />}>
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="usuarios/:id" element={<Navigate to="/admin/usuarios" replace />} />
          <Route path="usuarios/:id/suspender" element={<Navigate to="/admin/usuarios" replace />} />
          <Route path="cotizaciones" element={<AdminCotizaciones />} />
          <Route path="cotizaciones/nueva" element={<AdminNuevaCotizacion />} />
          <Route path="cotizaciones/:id" element={<AdminNuevaCotizacion />} />
          <Route path="pagos" element={<AdminPagos />} />
          <Route path="servicios" element={<AdminSolicitudesServicio />} />
          <Route path="recolecciones" element={<AdminRecolecciones />} />
          <Route path="payouts" element={<AdminPayouts />} />
          <Route path="reportes-producto" element={<AdminReportesProducto />} />
          <Route path="soporte" element={<AdminSoporteTickets />} />
          <Route path="empresas" element={<AdminEmpresas />} />
          <Route path="empresas/:id" element={<AdminEmpresaWorkspace />} />
          <Route path="aprobaciones" element={<AdminAprobaciones />} />
          <Route path="security" element={<AdminSecurityCenter />} />
          <Route path="superadmin" element={<AdminSuperAdmin />} />
          <Route path="observabilidad" element={<AdminObservabilidad />} />
          <Route path="auditorias" element={<AdminAuditorias />} />
          <Route path="ai-control" element={<AdminAiControl />} />
          <Route path="facturas" element={<AdminFacturas />} />
          <Route path="config-fiscal" element={<AdminConfigFiscal />} />
          <Route path="homepage" element={<AdminHomepage />} />
          <Route path="cupones" element={<AdminCupones />} />
          <Route path="publicaciones" element={<AdminPublicaciones />} />
          <Route path="multipais" element={<AdminMultipais />} />
        </Route>
        <Route path="planes" element={<Navigate to="/admin/billing/planes" replace />} />
        <Route path="billing/planes" element={<AdminPlanes />} />
        <Route path="billing/suscripcion" element={<AdminSuscripcion />} />
        <Route path="offline/cola" element={<AdminOfflineCola />} />
        <Route path="gift-cards" element={<PlanGate feature="giftCards" planRequerido="PYME"><AdminGiftCards /></PlanGate>} />
        <Route path="inventario" element={<RedirectSiSistema to="/admin/copilot"><PlanGate feature="ai" planRequerido="PYME"><AdminInventario /></PlanGate></RedirectSiSistema>} />
        <Route path="copilot" element={<AdminCopilotRoute />} />
        <Route path="ayuda" element={<AdminAyuda />} />
        <Route path="forecast" element={<RedirectSiSistema to="/admin/copilot"><PlanGate feature="ai" planRequerido="PYME"><AdminForecast /></PlanGate></RedirectSiSistema>} />
        <Route path="executive" element={<RedirectSiSistema to="/admin/reportes"><PlanGate feature="reportes" planRequerido="PYME"><AdminExecutive /></PlanGate></RedirectSiSistema>} />
        <Route path="asignar-compra" element={<RedirectSiSistema to="/admin/pedidos"><AdminAsignarProducto /></RedirectSiSistema>} />
        <Route path="ofertas" element={<AdminPromocionesRoute />} />
        <Route path="blog" element={<AdminBlogRoute />} />
        <Route path="pos" element={<AdminPOS />} />
        <Route path="pos/caja" element={<AdminPOSCaja />} />
        <Route path="pos/historial" element={<AdminPOSHistorial />} />
        <Route path="compras" element={<RedirectSiSistema to="/admin/configuracion"><PlanGate feature="compras" planRequerido="PYME"><AdminCompras /></PlanGate></RedirectSiSistema>} />
        <Route path="compras/nueva" element={<RedirectSiSistema to="/admin/configuracion"><PlanGate feature="compras" planRequerido="PYME"><AdminNuevaCompra /></PlanGate></RedirectSiSistema>} />
        <Route path="proveedores" element={<RedirectSiSistema to="/admin/configuracion"><AdminProveedores /></RedirectSiSistema>} />
      </Route>

      <Route path="/pos/pago/:token" element={<POSPagoPage />} />
      <Route path="/tienda/:slug" element={<TiendaLayout />}>
        <Route index element={<TiendaHomePage />} />
        <Route path="producto/:productoId" element={<TiendaProductoPage />} />
        <Route path="carrito" element={<TiendaCarritoPage />} />
        <Route path="checkout" element={<TiendaCheckoutPage />} />
        <Route path="checkout/exito" element={<TiendaSuccessPage />} />
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
