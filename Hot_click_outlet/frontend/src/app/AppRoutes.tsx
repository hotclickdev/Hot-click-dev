import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, AdminHomeRoute } from '@/app/routeGuards'
import AdminRoleSwitch from '@/app/AdminRoleSwitch'
import PrototipoRedirect from '@/app/PrototipoRedirect'
import { CajaAcceso, hijosCaja } from '@/app/CajaShell'
import PlataformaAcceso from '@/app/PlataformaAcceso'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const ClerkShell = CLERK_ENABLED ? lazy(() => import('@/components/auth/ClerkShell')) : null
const SSOCallback = CLERK_ENABLED ? lazy(() => import('@/pages/SSOCallback')) : null
const SSOComplete = CLERK_ENABLED ? lazy(() => import('@/pages/SSOComplete')) : null

const InicioPlataforma = lazy(() => import('@/pages/plataforma/InicioPlataforma'))
const NegociosPlataforma = lazy(() => import('@/pages/plataforma/NegociosPlataforma'))
const PedidosPlataforma = lazy(() => import('@/pages/plataforma/PedidosPlataforma'))
const PedidoDetalle = lazy(() => import('@/pages/plataforma/PedidoDetalle'))
const CompradorPlataforma = lazy(() => import('@/pages/plataforma/CompradorPlataforma'))
const ModeracionPlataforma = lazy(() => import('@/pages/plataforma/ModeracionPlataforma'))
const DineroPlataforma = lazy(() => import('@/pages/plataforma/DineroPlataforma'))
const OperacionPlataforma = lazy(() => import('@/pages/plataforma/OperacionPlataforma'))
const SeguridadPlataforma = lazy(() => import('@/pages/plataforma/SeguridadPlataforma'))
const IaPlataforma = lazy(() => import('@/pages/plataforma/IaPlataforma'))
const ReglasPlataforma = lazy(() => import('@/pages/plataforma/ReglasPlataforma'))
const CrmPlataforma = lazy(() => import('@/pages/plataforma/CrmPlataforma'))
const ControlPlataforma = lazy(() => import('@/pages/plataforma/ControlPlataforma'))
const CuentaPlataforma = lazy(() => import('@/pages/plataforma/CuentaPlataforma'))
const TiendaRapidaPage = lazy(() => import('@/pages/plataforma/TiendaRapidaPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const VisitanteDeprecatedRedirect = lazy(() => import('@/prototipo/visitante/visitanteDeprecado'))
const EmprendedorArea = lazy(() => import('@/app/FigmaSellerGate').then((m) => ({ default: m.EmprendedorArea })))
const PymeArea = lazy(() => import('@/app/FigmaSellerGate').then((m) => ({ default: m.PymeArea })))
const NegocioPlusArea = lazy(() => import('@/app/FigmaSellerGate').then((m) => ({ default: m.NegocioPlusArea })))
const ProductsPage = lazy(() => import('@/pages/ProductsPage'))
const DescubriPage = lazy(() => import('@/pages/DescubriPage'))
const CategoriasPage = lazy(() => import('@/pages/buscar/CategoriasPage'))
const BusquedaFotoPage = lazy(() => import('@/pages/buscar/BusquedaFotoPage'))
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const MisPedidosPage = lazy(() => import('@/pages/MisPedidosPage'))
const DetallePedidoPage = lazy(() => import('@/pages/DetallePedidoPage'))
const WishlistPage = lazy(() => import('@/pages/WishlistPage'))

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const RecuperarContrasenaPage = lazy(() => import('@/pages/auth/recuperar/RecuperarContrasenaPage'))
const NosotrosPage = lazy(() => import('@/pages/NosotrosPage'))
const AyudaPage = lazy(() => import('@/pages/AyudaPage'))
const ContactoPage = lazy(() => import('@/pages/ContactoPage'))
const InformacionPage = lazy(() => import('@/pages/InformacionPage'))
const PrivacidadPage = lazy(() => import('@/pages/PrivacidadPage'))
const TerminosPage = lazy(() => import('@/pages/TerminosPage'))
const DevolucionesPage = lazy(() => import('@/pages/DevolucionesPage'))
const EnviosPage = lazy(() => import('@/pages/EnviosPage'))
const AcuerdoVendedoresPage = lazy(() => import('@/pages/AcuerdoVendedoresPage'))
const CookiesPage = lazy(() => import('@/pages/CookiesPage'))

const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const PaymentStatusPage = lazy(() => import('@/pages/PaymentStatusPage'))
const TilopayRespuestaPage = lazy(() => import('@/pages/pago/TilopayRespuestaPage'))
const RecuperarCarritoPage = lazy(() => import('@/pages/RecuperarCarritoPage'))
const ServiciosHotPage = lazy(() => import('@/pages/ServiciosHotPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const SinConexionPage = lazy(() => import('@/pages/SinConexionPage'))
const CotizacionPublicaPage = lazy(() => import('@/pages/CotizacionPublicaPage'))
const EncargoPublicPage = lazy(() => import('@/pages/EncargoPublicPage'))
const SeguimientoPedidoPage = lazy(() => import('@/pages/SeguimientoPedidoPage'))
const EmpresaSelectionPage = lazy(() => import('@/pages/EmpresaSelectionPage'))
const BlogPage = lazy(() => import('@/pages/BlogPage'))
const BlogPostPage = lazy(() => import('@/pages/BlogPostPage'))
const EmprendimientosPage = lazy(() => import('@/pages/EmprendimientosPage'))
const SectorLandingPage = lazy(() => import('@/pages/seo/SectorLandingPage'))
const ProvinciaLandingPage = lazy(() => import('@/pages/seo/ProvinciaLandingPage'))
const EmprendePage = lazy(() => import('@/pages/EmprendePage'))
const PlanesPage = lazy(() => import('@/pages/planes/PlanesPage'))
const PymeLandingPage = lazy(() => import('@/pages/planes/PymeLandingPage'))
const NegocioPlusLandingPage = lazy(() => import('@/pages/planes/NegocioPlusLandingPage'))
const ModeSelector = lazy(() => import('@/pages/auth/ModeSelector'))
const POSPagoPage = lazy(() => import('@/pages/pos/POSPagoPage'))
const SelfCheckoutPage = lazy(() => import('@/pages/SelfCheckoutPage'))
const RegistrarNegocioPage = lazy(() => import('@/pages/RegistrarNegocioPage'))
const RegistroEmpresaPage = lazy(() => import('@/pages/RegistroEmpresaPage'))
const ActivarPlanPage = lazy(() => import('@/pages/registro-empresa/ActivarPlanPage'))
const TiendaLayout = lazy(() => import('@/pages/tienda/TiendaLayout'))
const TiendaHomePage = lazy(() => import('@/pages/tienda/TiendaHomePage'))
const TiendaProductoPage = lazy(() => import('@/pages/tienda/TiendaProductoPage'))
const TiendaCarritoPage = lazy(() => import('@/pages/tienda/TiendaCarritoPage'))
const TiendaCheckoutPage = lazy(() => import('@/pages/tienda/TiendaCheckoutPage'))
const TiendaSuccessPage = lazy(() => import('@/pages/tienda/TiendaSuccessPage'))

/**
 * Home `/` = marketplace de producción (Compra · Vende · Emprende).
 * `/visitante/*` deprecado (P1-08 opción A): redirige al marketplace real.
 * `/prototipo/*` redirige a prefijos por rol.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/visitante" element={<VisitanteDeprecatedRedirect />} />
      <Route path="/visitante/*" element={<VisitanteDeprecatedRedirect />} />
      <Route path="/emprendedor/*" element={<EmprendedorArea />} />
      <Route path="/pyme/*" element={<PymeArea />} />
      <Route path="/negocio-plus/*" element={<NegocioPlusArea />} />
      <Route path="/prototipo" element={<PrototipoRedirect />} />
      <Route path="/prototipo/*" element={<PrototipoRedirect />} />
      <Route path="/productos" element={<ProductsPage />} />
      <Route path="/descubri" element={<DescubriPage />} />
      <Route path="/categorias" element={<CategoriasPage />} />
      <Route path="/buscar/foto" element={<BusquedaFotoPage />} />
      <Route path="/productos/:id" element={<ProductDetailPage />} />
      <Route path="/carrito" element={<CartPage />} />
      <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/mis-pedidos" element={<ProtectedRoute><MisPedidosPage /></ProtectedRoute>} />
      <Route path="/mis-pedidos/:id" element={<ProtectedRoute><DetallePedidoPage /></ProtectedRoute>} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
      <Route path="/pago/exito" element={<PaymentStatusPage />} />
      <Route path="/pago/cancelado" element={<PaymentStatusPage />} />
      <Route path="/pago/tilopay/respuesta" element={<TilopayRespuestaPage />} />

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
      <Route path="/recuperar-contrasena" element={<RecuperarContrasenaPage />} />
      <Route path="/registro-empresa" element={<RegistroEmpresaPage />} />
      <Route path="/registro-empresa/activar-plan" element={<ActivarPlanPage />} />
      <Route path="/registrar-negocio" element={<ProtectedRoute><RegistrarNegocioPage /></ProtectedRoute>} />
      <Route path="/mode-select" element={<ModeSelector />} />
      <Route path="/seleccionar-negocio" element={<EmpresaSelectionPage />} />
      <Route path="/nosotros" element={<NosotrosPage />} />
      <Route path="/ayuda" element={<AyudaPage />} />
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
      <Route path="/seguimiento/:token" element={<SeguimientoPedidoPage />} />
      <Route path="/tienda-rapida/:token" element={<TiendaRapidaPage />} />
      <Route path="/servicios" element={<ServiciosHotPage />} />
      <Route path="/servicios/buscar-producto" element={<ServiciosHotPage />} />
      <Route path="/servicios/digitalizar-inventario" element={<ServiciosHotPage />} />
      <Route path="/comprar/:slug" element={<SectorLandingPage />} />
      <Route path="/tiendas/:provincia" element={<ProvinciaLandingPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/emprende" element={<EmprendePage />} />
      {/* Alias de marketing: /para-emprendedores apunta a la misma landing, sin fragmentar SEO. */}
      <Route path="/para-emprendedores" element={<Navigate to="/emprende" replace />} />
      <Route path="/para-pymes" element={<PymeLandingPage />} />
      <Route path="/planes" element={<PlanesPage />} />
      <Route path="/negocio-plus-plan" element={<NegocioPlusLandingPage />} />
      <Route path="/emprendimientos" element={<EmprendimientosPage />} />

      <Route path="/plataforma" element={<PlataformaAcceso />}>
        <Route index element={<InicioPlataforma />} />
        <Route path="negocios" element={<NegociosPlataforma />} />
        <Route path="negocios/:id" element={<NegociosPlataforma />} />
        <Route path="pedidos" element={<PedidosPlataforma />} />
        <Route path="pedidos/:id" element={<PedidoDetalle />} />
        <Route path="compradores/:id" element={<CompradorPlataforma />} />
        <Route path="moderacion" element={<ModeracionPlataforma />} />
        <Route path="moderacion/reportes" element={<ModeracionPlataforma />} />
        <Route path="dinero" element={<DineroPlataforma />} />
        <Route path="dinero/:vista" element={<DineroPlataforma />} />
        <Route path="crm" element={<CrmPlataforma />} />
        <Route path="control" element={<ControlPlataforma />} />
        <Route path="cuenta" element={<CuentaPlataforma />} />
        <Route path="operacion" element={<OperacionPlataforma />} />
        <Route path="operacion/:vista" element={<OperacionPlataforma />} />
        <Route path="seguridad" element={<SeguridadPlataforma />} />
        <Route path="ia" element={<IaPlataforma />} />
        <Route path="reglas" element={<ReglasPlataforma />} />
      </Route>

      <Route path="/caja" element={<CajaAcceso />}>
        {hijosCaja()}
      </Route>

      <Route path="/admin/*" element={<AdminRoleSwitch />}>
        <Route index element={<AdminHomeRoute />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      <Route path="/pos/pago/:token" element={<POSPagoPage />} />
      <Route path="/checkout/qr/:token" element={<SelfCheckoutPage />} />
      <Route path="/tienda/:slug" element={<TiendaLayout />}>
        <Route index element={<TiendaHomePage />} />
        <Route path="producto/:productoId" element={<TiendaProductoPage />} />
        <Route path="carrito" element={<TiendaCarritoPage />} />
        <Route path="checkout" element={<TiendaCheckoutPage />} />
        <Route path="checkout/exito" element={<TiendaSuccessPage />} />
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="/sin-conexion" element={<SinConexionPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
