import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import useAuthStore from '@/store/authStore'
import { orderService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import OrderCard from './pedidos/OrderCard'
import PedidosEmptyState from './pedidos/PedidosEmptyState'
import { pedidosDesdeRespuesta } from './pedidos/pedidoHelpers'

export default function MisPedidosPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()
  const { userId, token } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    if (!userId) return
    let cancelado = false
    orderService.getByUser(userId, page)
      .then(({ data }) => {
        if (cancelado) return
        const { pedidos, totalPages: paginas } = pedidosDesdeRespuesta(data)
        setOrders(pedidos)
        setTotalPages(paginas)
      })
      .catch(() => { if (!cancelado) toast({ message: t('common.error'), type: 'error' }) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [userId, token, page, navigate, toast, t])

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-4 sm:mb-6">
          <button type="button" onClick={() => navigate('/perfil')} className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
            style={{ color: 'var(--hc-muted)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('nav.perfil')}
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>{t('nav.misPedidos')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{t('orders.subtitle')}</p>
        </motion.div>

        <PedidosContenido
          loading={loading}
          orders={orders}
          onVerProductos={() => navigate('/productos')}
        />

        {totalPages > 1 && (
          <div className="flex justify-center gap-3 mt-8">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => { setLoading(true); setPage((p) => p - 1) }}>
              ← {t('common.previous')}
            </Button>
            <span className="text-sm self-center" style={{ color: 'var(--hc-muted)' }}>
              {page + 1} / {totalPages}
            </span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => { setLoading(true); setPage((p) => p + 1) }}>
              {t('common.next')} →
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

function PedidosContenido({ loading, orders, onVerProductos }) {
  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (orders.length === 0) return <PedidosEmptyState onVerProductos={onVerProductos} />
  return (
    <div className="space-y-3">
      {orders.map((order, i) => (
        <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <OrderCard order={order} />
        </motion.div>
      ))}
    </div>
  )
}
