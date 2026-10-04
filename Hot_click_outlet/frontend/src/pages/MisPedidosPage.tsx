import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import useAuthStore from '@/store/authStore'
import { orderService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import ListaPedidosComprador from './pedidos/ListaPedidosComprador'
import DetallePedidoComprador from './pedidos/DetallePedidoComprador'
import PedidosEmptyState from './pedidos/PedidosEmptyState'
import {
  pedidoPorNumero, pedidosDelComprador, type FiltroPedidos,
} from './pedidos/pedidoVistaHelpers'
import { pedidosDesdeRespuesta } from './pedidos/pedidoHelpers'
import type { PedidoCliente } from './pedidos/pedidoHelpers'
import { etiquetaPedido } from './perfil/cuenta/cuentaHelpers'

/** Mis pedidos (`28:1310`) y detalle por paquete (`29:1434`, con `?pedido=<numero>`). */
export default function MisPedidosPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()
  const [busqueda] = useSearchParams()
  const userId = useAuthStore((s) => s.userId)
  const token = useAuthStore((s) => s.token)
  const [orders, setOrders] = useState<PedidoCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [filtro, setFiltro] = useState<FiltroPedidos>('todos')

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

  const pedidos = useMemo(() => pedidosDelComprador(orders), [orders])
  const numeroDetalle = busqueda.get('pedido')
  const detalle = pedidoPorNumero(pedidos, numeroDetalle)

  const cuerpo = (() => {
    if (loading) return <div className="flex justify-center py-16"><Spinner variante="figma" /></div>
    if (numeroDetalle) {
      return detalle
        ? <DetallePedidoComprador pedido={detalle} />
        : <p className="px-4 py-10 text-center text-[13px] text-hc-n-600">{t('pedidoDetalle.noEncontrado')}</p>
    }
    if (pedidos.length === 0) return <PedidosEmptyState onVerProductos={() => navigate('/productos')} />
    return (
      <>
        <ListaPedidosComprador pedidos={pedidos} filtro={filtro} onFiltro={setFiltro} />
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pb-6">
            <button type="button" disabled={page === 0} onClick={() => { setLoading(true); setPage((p) => p - 1) }}
              className="rounded-full border border-hc-n-200 bg-hc-n-0 px-4 py-2 text-[13px] font-medium text-hc-n-900 disabled:opacity-45">
              {t('common.previous')}
            </button>
            <span className="text-[13px] text-hc-n-600">{page + 1} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages - 1} onClick={() => { setLoading(true); setPage((p) => p + 1) }}
              className="rounded-full border border-hc-n-200 bg-hc-n-0 px-4 py-2 text-[13px] font-medium text-hc-n-900 disabled:opacity-45">
              {t('common.next')}
            </button>
          </div>
        )}
      </>
    )
  })()

  const titulo = numeroDetalle && detalle
    ? t('pedidoDetalle.titulo', { numero: etiquetaPedido(detalle.numero) })
    : t('cuenta.menu.pedidos')

  return (
    <MainLayout variante="interna" titulo={titulo} esTituloPrincipal atras={numeroDetalle ? '/mis-pedidos' : '/perfil'} barraInferior={!numeroDetalle}>
      {cuerpo}
    </MainLayout>
  )
}
