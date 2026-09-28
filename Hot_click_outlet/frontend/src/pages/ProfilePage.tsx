import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import MainLayout from '@/layouts/MainLayout'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import { orderService } from '@/services/orderService'
import { authService } from '@/services/authService'
import { servicioService } from '@/services/servicioService'
import { testimonioService } from '@/services/testimonioService'
import AdminWebAuthnSetup from '@/components/admin/AdminWebAuthnSetup'
import ProfileHeader from './perfil/ProfileHeader'
import ProfileOrdersCard from './perfil/ProfileOrdersCard'
import ProfileSecurityCard from './perfil/ProfileSecurityCard'
import OpinionesSection from './perfil/OpinionesSection'
import ChangePasswordModal from './perfil/ChangePasswordModal'
import TwoFAModal from './perfil/TwoFAModal'
import PedidoActivoCard from './perfil/PedidoActivoCard'
import ActividadReciente from './perfil/ActividadReciente'
import ListaAccesos from '@/components/comprador/estados/ListaAccesos'
import { AccesoAyuda, AccesoFavoritos, AccesoOpiniones, AccesoPedidos, AccesoSeguridad, AccesoSolicitudes } from '@/components/comprador/estados/iconosAcceso'
import { listaPedidosDesdeRespuesta, flagCampoApi } from './perfil/perfilHelpers'
import { pedidoActivo, construirActividad } from './perfil/actividadRecienteHelpers'
import type { SolicitudBusqueda, ProductoParaResena } from './servicios/serviciosHelpers'
import type { PedidoCliente } from './pedidos/pedidoHelpers'

function extraerLista<T>(data: unknown): T[] {
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data
    if (Array.isArray(inner)) return inner as T[]
  }
  return []
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const userId = useAuthStore((s) => s.userId)
  const userRole = useAuthStore((s) => s.userRole)
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const [orders, setOrders] = useState<PedidoCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  useEffect(() => {
    if (!userId) return
    orderService.getByUser(userId)
      .then(({ data }) => setOrders(listaPedidosDesdeRespuesta(data)))
      .catch(() => toast({ message: 'Error al cargar pedidos', type: 'error' }))
      .finally(() => setLoading(false))
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps -- montaje por userId

  useEffect(() => {
    authService.get2FAStatus()
      .then(({ data }) => setTwoFAEnabled(flagCampoApi(data, 'enabled') ?? false))
      .catch(() => toast({ message: 'Error al cargar estado 2FA', type: 'error' }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- montaje único

  // Mismos datos que ya carga Servicios HOT y Mis opiniones: sin endpoint nuevo.
  const { data: solicitudes = [] } = useQuery({
    queryKey: ['mis-solicitudes-servicio'],
    queryFn: () => servicioService.misSolicitudes().then((r) => extraerLista<SolicitudBusqueda>(r.data)),
    enabled: !!userId,
  })
  const { data: productosParaResenar = [] } = useQuery({
    queryKey: ['productos-para-resenar'],
    queryFn: () => testimonioService.getProductosParaResenar().then((r) => extraerLista<ProductoParaResena>(r.data)),
    enabled: !!userId,
  })

  const handleLogout = () => {
    authService.logout().catch(() => { /* ok */ })
    logout()
    toast({ message: t('profile.loggedOut'), type: 'info' })
    navigate('/')
  }

  const activo = pedidoActivo(orders)
  const actividad = construirActividad(orders, solicitudes, productosParaResenar)
  const accesos = [
    { to: '/mis-pedidos', texto: t('bnav.pedido', 'Mis pedidos'), icono: <AccesoPedidos /> },
    { to: '/servicios', texto: t('nav.servicios'), icono: <AccesoSolicitudes /> },
    { to: '/wishlist', texto: t('wishlist.title'), icono: <AccesoFavoritos /> },
    { to: '#opinion', texto: t('perfil.misOpiniones', 'Mis opiniones'), icono: <AccesoOpiniones /> },
    { to: '#seguridad', texto: t('profile.security'), icono: <AccesoSeguridad /> },
    { to: '/ayuda', texto: t('nav.ayuda'), icono: <AccesoAyuda /> },
  ]

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        <ProfileHeader twoFAEnabled={twoFAEnabled} onLogout={handleLogout} />
        {activo && <PedidoActivoCard pedido={activo} />}
        <ListaAccesos accesos={accesos} etiqueta={t('perfil.accesosRapidos', 'Accesos')} />
        <ActividadReciente items={actividad} />
        <ProfileOrdersCard orders={orders} loading={loading} />
        <div id="seguridad">
          <ProfileSecurityCard
            twoFAEnabled={twoFAEnabled}
            isAdmin={isAdmin()}
            onChangePassword={() => setShowChangePassword(true)}
            onSetup2FA={() => setShow2FASetup(true)}
          />
        </div>
        {userRole === 'ADMIN' && <AdminWebAuthnSetup />}
        <div id="opinion">
          <OpinionesSection orders={orders} ordersLoading={loading} />
        </div>
      </div>

      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        refreshToken={null}
      />
      {isAdmin() && (
        <TwoFAModal
          open={show2FASetup}
          onClose={() => setShow2FASetup(false)}
          enabled={twoFAEnabled}
          onToggle={(val) => setTwoFAEnabled(val)}
        />
      )}
    </MainLayout>
  )
}
