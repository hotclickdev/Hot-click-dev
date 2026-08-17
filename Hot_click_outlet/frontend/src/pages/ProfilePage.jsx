import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import { orderService } from '@/services/orderService'
import { authService } from '@/services/authService'
import AdminWebAuthnSetup from '@/components/admin/AdminWebAuthnSetup'
import ProfileHeader from './perfil/ProfileHeader'
import ProfileOrdersCard from './perfil/ProfileOrdersCard'
import ProfileSecurityCard from './perfil/ProfileSecurityCard'
import OpinionesSection from './perfil/OpinionesSection'
import ChangePasswordModal from './perfil/ChangePasswordModal'
import TwoFAModal from './perfil/TwoFAModal'
import { listaPedidosDesdeRespuesta } from './perfil/perfilHelpers'

export default function ProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const { userId, userRole, logout, refreshToken, isAdmin } = useAuthStore()
  const [orders, setOrders] = useState([])
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
      .then(({ data }) => setTwoFAEnabled(data?.enabled ?? false))
      .catch(() => toast({ message: 'Error al cargar estado 2FA', type: 'error' }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- montaje único

  const handleLogout = () => {
    if (refreshToken) authService.logout(refreshToken).catch(() => { /* ok */ })
    logout()
    toast({ message: t('profile.loggedOut'), type: 'info' })
    navigate('/')
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        <ProfileHeader twoFAEnabled={twoFAEnabled} onLogout={handleLogout} />
        <ProfileOrdersCard orders={orders} loading={loading} />
        <ProfileSecurityCard
          twoFAEnabled={twoFAEnabled}
          isAdmin={isAdmin()}
          onChangePassword={() => setShowChangePassword(true)}
          onSetup2FA={() => setShow2FASetup(true)}
        />
        {userRole === 'ADMIN' && <AdminWebAuthnSetup />}
        <OpinionesSection orders={orders} ordersLoading={loading} />
      </div>

      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        refreshToken={refreshToken}
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
