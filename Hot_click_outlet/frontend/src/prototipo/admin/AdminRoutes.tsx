import { Route, Routes } from 'react-router-dom'
import AdminAprobacionesPage from './AdminAprobacionesPage'
import AdminAuditoriasPage from './AdminAuditoriasPage'
import AdminCargaMasivaCompletadaPage from './AdminCargaMasivaCompletadaPage'
import AdminCargaMasivaPage from './AdminCargaMasivaPage'
import AdminCargaMasivaRevisarPage from './AdminCargaMasivaRevisarPage'
import AdminCategoriasPage from './AdminCategoriasPage'
import AdminCerrarSesionPage from './AdminCerrarSesionPage'
import AdminClientesPage from './AdminClientesPage'
import AdminConfigPage from './AdminConfigPage'
import AdminDashboardPage from './AdminDashboardPage'
import AdminGarantiasPage from './AdminGarantiasPage'
import AdminHerramientasPage from './AdminHerramientasPage'
import AdminLoginPage from './AdminLoginPage'
import AdminMarcasPage from './AdminMarcasPage'
import AdminModeracionPage from './AdminModeracionPage'
import AdminNotificacionesPage from './AdminNotificacionesPage'
import AdminNuevaCategoriaPage from './AdminNuevaCategoriaPage'
import AdminPagosPage from './AdminPagosPage'
import AdminPoliticaPage from './AdminPoliticaPage'
import AdminProductoAprobadoPage from './AdminProductoAprobadoPage'
import AdminProximamentePage from './AdminProximamentePage'
import AdminRechazarProductoPage from './AdminRechazarProductoPage'
import AdminServiciosPage from './AdminServiciosPage'
import AdminShell from './AdminShell'
import AdminSuspenderTiendaPage from './AdminSuspenderTiendaPage'
import AdminSuspenderUsuarioPage from './AdminSuspenderUsuarioPage'
import AdminTestimoniosPage from './AdminTestimoniosPage'
import AdminTiendaDetallePage from './AdminTiendaDetallePage'
import AdminTiendasPage from './AdminTiendasPage'
import AdminUsuarioDetallePage from './AdminUsuarioDetallePage'
import AdminUsuariosPage from './AdminUsuariosPage'
import AdminVistaPreviaTiendaPage from './AdminVistaPreviaTiendaPage'

/**
 * Rutas del prototipo Super Admin (Figma 41:128).
 */
export default function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminLoginPage />} />
      <Route element={<AdminShell />}>
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="tiendas" element={<AdminTiendasPage />} />
        <Route path="tiendas/:id" element={<AdminTiendaDetallePage />} />
        <Route path="tiendas/:id/preview" element={<AdminVistaPreviaTiendaPage />} />
        <Route path="tiendas/:id/suspender" element={<AdminSuspenderTiendaPage />} />
        <Route path="usuarios" element={<AdminUsuariosPage />} />
        <Route path="usuarios/:id" element={<AdminUsuarioDetallePage />} />
        <Route path="usuarios/:id/suspender" element={<AdminSuspenderUsuarioPage />} />
        <Route path="moderacion" element={<AdminModeracionPage />} />
        <Route path="moderacion/aprobado" element={<AdminProductoAprobadoPage />} />
        <Route path="moderacion/rechazar" element={<AdminRechazarProductoPage />} />
        <Route path="config" element={<AdminConfigPage />} />
        <Route path="config/categorias" element={<AdminCategoriasPage />} />
        <Route path="config/categorias/nueva" element={<AdminNuevaCategoriaPage />} />
        <Route path="config/politica" element={<AdminPoliticaPage />} />
        <Route path="config/pagos" element={<AdminPagosPage />} />
        <Route path="config/notificaciones" element={<AdminNotificacionesPage />} />
        <Route path="cerrar-sesion" element={<AdminCerrarSesionPage />} />
        <Route path="carga-masiva" element={<AdminCargaMasivaPage />} />
        <Route path="carga-masiva/revisar" element={<AdminCargaMasivaRevisarPage />} />
        <Route path="carga-masiva/completada" element={<AdminCargaMasivaCompletadaPage />} />
        <Route path="herramientas" element={<AdminHerramientasPage />} />
        <Route path="herramientas/marcas" element={<AdminMarcasPage />} />
        <Route path="herramientas/garantias" element={<AdminGarantiasPage />} />
        <Route path="herramientas/clientes" element={<AdminClientesPage />} />
        <Route path="herramientas/auditorias" element={<AdminAuditoriasPage />} />
        <Route path="herramientas/servicios" element={<AdminServiciosPage />} />
        <Route path="herramientas/aprobaciones" element={<AdminAprobacionesPage />} />
        <Route path="herramientas/testimonios" element={<AdminTestimoniosPage />} />
        <Route path="proximamente" element={<AdminProximamentePage />} />
      </Route>
    </Routes>
  )
}
