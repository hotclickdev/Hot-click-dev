import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import { orderService } from '@/services/orderService'
import { formatDate, formatPrice, statusColor } from '@/utils/format'

export default function ProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const { userId, userName, userEmail, userRole, logout } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    orderService.getByUser(userId)
      .then(({ data }) => setOrders(Array.isArray(data) ? data : data.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const handleLogout = () => {
    logout()
    toast({ message: 'Sesión cerrada', type: 'info' })
    navigate('/')
  }

  const roleLabel = { ADMIN_IT: 'Admin IT', ADMIN_CLIENTE: 'Admin Cliente', USUARIO_FINAL: 'Cliente' }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111114] border border-white/8 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-[#4f7cff]/20 flex items-center justify-center text-2xl font-bold text-[#4f7cff] shrink-0">
              {userName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#e8e8ed] truncate">{userName || 'Usuario'}</h1>
              <p className="text-sm text-[#8e8e9a] truncate">{userEmail}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="accent">{roleLabel[userRole] ?? userRole}</Badge>
              </div>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={handleLogout} className="self-start sm:self-center shrink-0">
            {t('profile.logout')}
          </Button>
        </motion.div>

        {/* Orders shortcut */}
        <div
          className="flex items-center justify-between p-5 rounded-2xl border cursor-pointer transition-all"
          style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
          onClick={() => navigate('/mis-pedidos')}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{t('profile.orders')}</p>
              {loading ? (
                <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>Cargando…</p>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                  {orders.length > 0 ? `${orders.length} pedido${orders.length !== 1 ? 's' : ''}` : 'Sin pedidos aún'}
                </p>
              )}
            </div>
          </div>
          <svg className="w-4 h-4" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </MainLayout>
  )
}
