import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { formatoColon } from '@/theme/formatoColon'
import { marcarPedidoEnviadoApi } from '@/prototipo/compartido/pedidosVendedorApi'
import EstadoVacioConversacional from '@/prototipo/compartido/motion/EstadoVacioConversacional'
import { EASE_PREMIUM } from '@/prototipo/compartido/motion/formularioMotionTokens'
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
  const [confirmando, setConfirmando] = useState(false)
  const pedido = pedidos.find((p) => p.id === id)

  async function marcarEnviado() {
    setMarcando(true)
    setErrorMarca(null)
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

  function abrirConfirmacion() {
    setErrorMarca(null)
    setConfirmando(true)
  }

  function cancelarConfirmacion() {
    setErrorMarca(null)
    setConfirmando(false)
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
        <EstadoVacioConversacional
          titulo={error ? 'No pudimos cargar el pedido' : 'No encontramos ese pedido'}
          mensaje={error ?? 'Puede que el enlace ya no valga. Volvé al listado e intentá de nuevo.'}
        />
      </main>
    )
  }

  return (
    <EmprendedorPageFrame titulo={`Pedido #${pedido.id}`} volverA={`${RUTA_EMPRENDEDOR}/pedidos`}>
      {confirmando && pedido.estado === 'Pendiente' ? (
        <ConfirmacionEnvio
          pedido={pedido}
          errorMarca={errorMarca}
          marcando={marcando}
          onConfirmar={() => void marcarEnviado()}
          onCancelar={cancelarConfirmacion}
        />
      ) : (
        <DetallePedidoContenido pedido={pedido} onConfirmarEnvio={abrirConfirmacion} />
      )}
    </EmprendedorPageFrame>
  )
}

type ConfirmacionProps = {
  pedido: PedidoEmprendedor
  errorMarca: string | null
  marcando: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

function ConfirmacionEnvio({ pedido, errorMarca, marcando, onConfirmar, onCancelar }: ConfirmacionProps) {
  return (
    <>
      <EmprendedorCard className="flex flex-col gap-4">
        <EmprendedorFilaLista titulo="Cliente" detalle={pedido.cliente} />
        <EmprendedorFilaLista titulo="Total" detalle={formatoColon(pedido.total)} />
      </EmprendedorCard>
      <p className="text-[15px] font-semibold text-hc-text">¿Confirmás que ya enviaste este pedido?</p>
      {errorMarca ? <p className="text-sm text-hc-danger">{errorMarca}</p> : null}
      <div className="flex flex-col gap-2">
        <CtaEnvio variante="primario" disabled={marcando} onClick={onConfirmar}>
          {marcando ? 'Guardando…' : 'Sí, confirmar envío'}
        </CtaEnvio>
        <CtaEnvio variante="contorno" disabled={marcando} onClick={onCancelar}>
          Cancelar
        </CtaEnvio>
      </div>
    </>
  )
}

function DetallePedidoContenido({
  pedido,
  onConfirmarEnvio,
}: {
  pedido: PedidoEmprendedor
  onConfirmarEnvio: () => void
}) {
  return (
    <>
      <EmprendedorCard className="flex flex-col gap-4">
        <EmprendedorFilaLista titulo="Cliente" detalle={pedido.cliente} />
        <EmprendedorFilaLista titulo="Fecha" detalle={pedido.fecha || '—'} />
        <EmprendedorFilaLista titulo="Dirección" detalle={pedido.direccion || '—'} />
        <EmprendedorFilaLista titulo="Productos" detalle={resumenProductos(pedido)} />
        <EmprendedorFilaLista titulo="Total" detalle={formatoColon(pedido.total)} />
      </EmprendedorCard>
      {pedido.estado === 'Pendiente' ? (
        <CtaEnvio variante="primario" onClick={onConfirmarEnvio}>
          Confirmar envío
        </CtaEnvio>
      ) : null}
    </>
  )
}

type CtaEnvioProps = Readonly<{
  children: ReactNode
  variante: 'primario' | 'contorno'
  disabled?: boolean
  onClick: () => void
}>

function CtaEnvio({ children, variante, disabled = false, onClick }: CtaEnvioProps) {
  const reduced = useReducedMotion() ?? false
  const estilos =
    variante === 'primario'
      ? 'bg-hc-primary px-5 py-4 text-[15px] font-bold text-white disabled:opacity-60'
      : 'border border-hc-border py-3.5 text-[13px] font-medium text-hc-text disabled:opacity-40'
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center justify-center rounded-[14px] disabled:pointer-events-none ${estilos}`}
      whileHover={reduced || disabled ? undefined : { y: -2 }}
      whileTap={reduced || disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2, ease: EASE_PREMIUM }}
    >
      {children}
    </motion.button>
  )
}

function resumenProductos(pedido: PedidoEmprendedor): string {
  if (pedido.productos.length === 0) return '—'
  return pedido.productos
    .map((item) => `${item.nombre} x${item.cantidad} — ${formatoColon(item.precio)}`)
    .join(' · ')
}
