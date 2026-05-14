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

        {/* Orders */}
        <div>
          <h2 className="text-lg font-semibold text-[#e8e8ed] mb-4">{t('profile.orders')}</h2>
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-[#111114] border border-white/8 rounded-2xl">
              <span className="text-4xl opacity-20">📋</span>
              <p className="text-[#8e8e9a] mt-3">{t('profile.noOrders')}</p>
              <Button onClick={() => navigate('/productos')} variant="secondary" size="sm" className="mt-4">
                Explorar productos
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-[#111114] border border-white/8 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#e8e8ed]">Pedido #{order.id}</p>
                    <p className="text-xs text-[#8e8e9a] mt-0.5">
                      {order.fechaCreacion ? formatDate(order.fechaCreacion) : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#e8e8ed]">{formatPrice(order.total ?? 0)}</span>
                    <Badge variant={statusColor(order.estado)}>{order.estado}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
