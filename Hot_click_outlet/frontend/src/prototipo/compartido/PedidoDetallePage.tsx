import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { Boton, EncabezadoPagina, Miniatura } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'
import { usePedidosEmprendedor } from '@/prototipo/emprendedor/hooks/usePedidosEmprendedor'
import { marcarPedidoEnviadoApi } from './pedidosVendedorApi'
import type { PedidoMock } from './mock'

/**
 * Detalle de pedido (Figma 127:290 / 126:297) — API real.
 */
export default function PedidoDetallePage() {
  const { id } = useParams()
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const { seller, cargando, error } = usePedidosEmprendedor()
  const [marcando, setMarcando] = useState(false)
  const [errorMarca, setErrorMarca] = useState<string | null>(null)
  const pedido = id ? seller.find((item) => item.id === id) : undefined

  async function marcarEnviado() {
    if (!id) return
    setMarcando(true)
    try {
      await marcarPedidoEnviadoApi(id)
      navigate(ruta('pedidos'))
    } catch (err: unknown) {
      console.error('[PedidoDetalle]', err)
      setErrorMarca('No se pudo marcar el pedido como enviado.')
    } finally {
      setMarcando(false)
    }
  }

  if (cargando) {
    return (
      <main className="px-5 py-16">
        <p className="text-sm text-hc-muted">Cargando pedido…</p>
      </main>
    )
  }
  if (error || !pedido) {
    return (
      <main className="px-5 py-16">
        <p className="text-sm text-hc-muted">{error ?? 'No encontramos ese pedido.'}</p>
        <button type="button" onClick={() => navigate(ruta('pedidos'))} className="mt-4 inline-flex min-h-11 text-sm font-semibold text-hc-accent">
          Volver a pedidos
        </button>
      </main>
    )
  }
  return (
    <main className="px-5 pb-8 pt-[60px] md:px-12 md:py-12 md:pt-12">
      <div className="md:hidden">
        <EncabezadoPagina titulo={`Pedido #${pedido.id}`} volverA={ruta('pedidos')} />
      </div>
      <header className="mb-5 hidden md:block">
        <h1 className="font-display text-[28px] font-bold">Pedido #{pedido.id}</h1>
        {plan.id === 'negocioPlus' || pedido.sucursal ? (
          <p className="mt-1 text-sm text-hc-muted">{pedido.sucursal ?? 'Sucursal no asignada'}</p>
        ) : null}
      </header>
      {plan.id === 'negocioPlus' ? (
        <p className="mb-2 text-xs text-hc-muted md:hidden">{pedido.sucursal ?? 'Sucursal no asignada'}</p>
      ) : null}
      <span
        className="rounded-full px-3 py-1 text-xs"
        style={
          pedido.estado === 'Pendiente'
            ? { background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)' }
            : estiloEstadoDetalle(pedido.estado)
        }
      >
        {pedido.estado === 'Pendiente' ? 'Pendiente de envío' : pedido.estado}
      </span>
      <dl className="mt-5 space-y-3 text-sm md:max-w-[760px]">
        <FilaDato label="Cliente" valor={pedido.cliente} />
        {plan.id === 'negocioPlus' || pedido.sucursal ? (
          <FilaDato label="Sucursal" valor={pedido.sucursal ?? '—'} />
        ) : null}
        <FilaDato label="Fecha" valor={pedido.fecha || '—'} />
        <FilaDato label="Dirección" valor={pedido.direccion || '—'} />
      </dl>
      <hr className="my-4 border-hc-border md:max-w-[760px]" />
      <h2 className="mb-3 font-semibold">Productos</h2>
      <div className="md:max-w-[760px]">
        <ListaItems pedido={pedido} />
        <div className="mt-4 flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatoColon(pedido.total)}</span>
        </div>
        {errorMarca ? <p className="mt-3 text-sm text-hc-danger">{errorMarca}</p> : null}
        {pedido.estado === 'Pendiente' ? (
          <div className="mt-6">
            <Boton onClick={() => void marcarEnviado()}>{marcando ? 'Guardando…' : 'Marcar como enviado'}</Boton>
          </div>
        ) : null}
      </div>
    </main>
  )
}

function ListaItems({ pedido }: { pedido: PedidoMock }) {
  return (
    <ul className="space-y-3">
      {pedido.items.map((item) => (
        <li key={item.nombre} className="flex items-center gap-3">
          <Miniatura className="size-12" />
          <div className="flex-1">
            <p className="text-sm">{item.nombre}</p>
            <p className="text-xs text-hc-muted">x{item.cantidad}</p>
          </div>
          <span className="text-sm">{formatoColon(item.precio * item.cantidad)}</span>
        </li>
      ))}
    </ul>
  )
}

function FilaDato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-hc-muted">{label}</dt>
      <dd>{valor}</dd>
    </div>
  )
}

function estiloEstadoDetalle(estado: PedidoMock['estado']): { background: string; color: string } {
  if (estado === 'Entregado') return { background: 'var(--hc-success-bg)', color: 'var(--hc-success)' }
  if (estado === 'Enviado') return { background: 'var(--hc-info-bg)', color: 'var(--hc-info)' }
  return { background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)' }
}
