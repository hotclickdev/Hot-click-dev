import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import EstadoError from '@/components/comprador/estados/EstadoError'
import useAuthStore from '@/store/authStore'
import { orderService } from '@/services/orderService'
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
  const [busqueda] = useSearchParams()
  const userId = useAuthStore((s) => s.userId)
  const token = useAuthStore((s) => s.token)
  const [orders, setOrders] = useState<PedidoCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [intento, setIntento] = useState(0)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [filtro, setFiltro] = useState<FiltroPedidos>('todos')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    if (!userId) return
    let cancelado = false
    setLoading(true)
    setErrorCarga(false)
    orderService.getByUser(userId, page)
      .then(({ data }) => {
        if (cancelado) return
        const { pedidos, totalPages: paginas } = pedidosDesdeRespuesta(data)
        setErrorCarga(false)
        setOrders(pedidos)
        setTotalPages(paginas)
      })
      .catch(() => { if (!cancelado) setErrorCarga(true) })
      .finally(() => { if (!cancelado) setLoading(false) })
    const limite = window.setTimeout(() => {
      if (!cancelado) { setErrorCarga(true); setLoading(false) }
    }, 20_000)
    return () => { cancelado = true; window.clearTimeout(limite) }
  }, [userId, token, page, navigate, intento])

  const pedidos = useMemo(() => pedidosDelComprador(orders), [orders])
  const numeroDetalle = busqueda.get('pedido')
  const detalle = pedidoPorNumero(pedidos, numeroDetalle)

  const cuerpo = (() => {
    if (loading) return <ListaSkeleton />
    if (errorCarga) {
      return (
        <EstadoError
          nivel="h2"
          titulo={t('common.error')}
          texto={t('misPedidos.errorCarga', { defaultValue: 'No pudimos cargar tus pedidos.' })}
          accion={{ texto: t('comun.reintentar', { defaultValue: 'Reintentar' }), onClick: () => setIntento((n) => n + 1) }}
        />
      )
    }
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

function ListaSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-4" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-[14px] bg-hc-n-100" />
      ))}
    </div>
  )
}
