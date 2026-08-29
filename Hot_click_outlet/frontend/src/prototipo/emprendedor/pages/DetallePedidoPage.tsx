import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { marcarPedidoEnviadoApi } from '@/prototipo/compartido/pedidosVendedorApi'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import EmprendedorPageFrame, { EmprendedorCard, EmprendedorFilaLista } from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { usePedidosEmprendedor } from '../hooks/usePedidosEmprendedor'
import type { PedidoEmprendedor } from '../types'

/**
 * Detalle de pedido (Figma 128:157 / 352:10640).
 */
export default function DetallePedidoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { pedidos, cargando, error } = usePedidosEmprendedor()
  const [marcando, setMarcando] = useState(false)
  const [errorMarca, setErrorMarca] = useState<string | null>(null)
  const pedido = pedidos.find((p) => p.id === id)

  async function marcarEnviado() {
    setMarcando(true)
    try {
      await marcarPedidoEnviadoApi(id)
      navigate(`${RUTA_EMPRENDEDOR}/pedidos`)
    } catch (err: unknown) {
      console.error('[DetallePedido]', err)
      setErrorMarca('No se pudo marcar el pedido como enviado.')
    } finally {
      setMarcando(false)
    }
  }

  if (cargando) {
    return (
      <main className="px-5 py-8 md:px-16 md:py-12">
        <CabeceraAtras titulo="Pedido" to={`${RUTA_EMPRENDEDOR}/pedidos`} />
        <p className="mt-4 text-sm text-hc-muted">Cargando pedido…</p>
      </main>
    )
  }

  if (error || !pedido) {
    return (
      <main className="px-5 py-8 md:px-16 md:py-12">
        <CabeceraAtras titulo="Pedido" to={`${RUTA_EMPRENDEDOR}/pedidos`} />
        <p className="mt-4 text-sm text-hc-muted">{error ?? 'No encontramos ese pedido.'}</p>
      </main>
    )
  }

  return (
    <EmprendedorPageFrame titulo={`Pedido #${pedido.id}`} volverA={`${RUTA_EMPRENDEDOR}/pedidos`}>
      <EmprendedorCard className="flex flex-col gap-4">
        <EmprendedorFilaLista titulo="Cliente" detalle={pedido.cliente} />
        <EmprendedorFilaLista titulo="Fecha" detalle={pedido.fecha || '—'} />
        <EmprendedorFilaLista titulo="Dirección" detalle={pedido.direccion || '—'} />
        <EmprendedorFilaLista titulo="Productos" detalle={resumenProductos(pedido)} />
        <EmprendedorFilaLista titulo="Total" detalle={formatoColon(pedido.total)} />
      </EmprendedorCard>
      {errorMarca ? <p className="text-sm text-hc-danger">{errorMarca}</p> : null}
      {pedido.estado === 'Pendiente' ? (
        <BotonPrimario onClick={() => void marcarEnviado()}>
          {marcando ? 'Guardando…' : 'Marcar como enviado'}
        </BotonPrimario>
      ) : null}
    </EmprendedorPageFrame>
  )
}

function resumenProductos(pedido: PedidoEmprendedor): string {
  if (pedido.productos.length === 0) return '—'
  return pedido.productos
    .map((item) => `${item.nombre} x${item.cantidad} — ${formatoColon(item.precio)}`)
    .join(' · ')
}
