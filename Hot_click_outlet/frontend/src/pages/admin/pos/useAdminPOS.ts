import { useState, useEffect, useCallback } from 'react'
import { posService } from '@/services/posService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import usePosStore from '@/store/posStore'
import type { Id, JsonBody } from '@/types/api'
import {
  agregarProductoAlCarrito,
  mensajeErrorPos,
  qrDataDesdeRespuesta,
  statusErrorPos,
  type ClienteSeleccionadoPos,
  type ItemCarritoPos,
  type PayloadCobroPos,
  type PosQrData,
  type PosStep,
  type PosTurno,
  type PosVenta,
  type ProductoEntradaCarrito,
} from './posHelpers'

function armarReceiptQr(
  qrData: PosQrData | null,
  cartItems: ItemCarritoPos[],
  autoConfirmed: boolean,
  numeroPedido = '—',
): PosVenta {
  return {
    totalPedido:  qrData?.total,
    metodoPago:   autoConfirmed ? qrData?.metodoPago : 'SINPE',
    numeroPedido,
    items: cartItems.map(i => ({
      producto: { nombreProducto: i.nombre },
      cantidad: i.cantidad,
      subtotalItem: Number(i.precio) * i.cantidad,
    })),
  }
}

export type ReportePendientePos = { mensaje: string }

/**
 * Estado y handlers del POS — bit-idéntico al orquestador original.
 */
export function useAdminPOS() {
  const { showToast } = useToast()
  const userName = useAuthStore(s => s.userName)
  const userRole = useAuthStore(s => s.userRole)
  const { bodegaId } = usePosStore()

  const [step, setStep]   = useState<PosStep>('loading')
  const [turno, setTurno] = useState<PosTurno | null>(null)
  const [saving, setSaving] = useState(false)

  const [cartItems, setCartItems]   = useState<ItemCarritoPos[]>([])
  const [descuento, setDescuento]   = useState(0)
  const [cliente, setCliente]       = useState<ClienteSeleccionadoPos>(null) // { id, nombre } | null = mostrador
  const [receipt, setReceipt]       = useState<PosVenta | null>(null)
  const [qrData, setQrData]         = useState<PosQrData | null>(null)
  const [loadingVenta, setLoadingVenta]     = useState(false)
  const [loadingConfirm, setLoadingConfirm] = useState(false)
  const [reportePendiente, setReportePendiente] = useState<ReportePendientePos | null>(null)

  const toastErrorConReporte = (mensaje: string) => {
    showToast(mensaje, 'error')
    setReportePendiente({ mensaje })
  }

  const limpiarReportePendiente = () => setReportePendiente(null)

  useEffect(() => {
    const init = async () => {
      try {
        // posService ya hace .then(r => r.data), así que res ES el turno directamente
        const t = await posService.getCajaActiva() as PosTurno | null | undefined
        setTurno(t ?? null)
        setStep(t ? 'venta' : 'apertura')
      } catch {
        // 404 = no hay turno activo; otros errores muestran apertura igual
        setStep('apertura')
      }
    }
    init()
  }, [])

  const agregarProducto = useCallback((producto: ProductoEntradaCarrito) => {
    setCartItems(prev => agregarProductoAlCarrito(prev, producto))
  }, [])

  const setCantidad = (id: Id | undefined, val: string | number) => {
    const n = Math.max(1, Number.parseInt(String(val)) || 1)
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, cantidad: n } : i))
  }

  const setPrecio = (id: Id | undefined, val: string) => {
    const n = Number.parseInt(String(val).replace(/\D/g, ''))
    if (!Number.isNaN(n)) setCartItems(prev => prev.map(i => i.id === id ? { ...i, precio: n } : i))
  }

  const quitarItem = (id: Id | undefined) => setCartItems(prev => prev.filter(i => i.id !== id))

  const nuevaVenta = () => {
    setCartItems([])
    setDescuento(0)
    setCliente(null)
    setReceipt(null)
    setQrData(null)
    setStep('venta')
  }

  const subtotal = cartItems.reduce((s, i) => s + Number(i.precio) * i.cantidad, 0)
  const total    = Math.max(0, subtotal - descuento)

  const handleAbrir = async (montoInicial: number) => {
    setSaving(true)
    try {
      // posService ya hace .then(r => r.data)
      const turnoData = await posService.abrirCaja({ montoInicial } as JsonBody) as PosTurno
      setTurno(turnoData)
      setStep('venta')
      showToast('Turno abierto — ¡a vender!', 'success')
    } catch (err: unknown) {
      const msg = mensajeErrorPos(err)
      // Si ya existe un turno abierto, obtenerlo en vez de bloquearse
      if (msg.toLowerCase().includes('turno') || msg.toLowerCase().includes('caja') || statusErrorPos(err) === 409) {
        try {
          const t = await posService.getCajaActiva() as PosTurno | null | undefined
          if (t) { setTurno(t); setStep('venta'); showToast('Turno existente recuperado', 'info'); return }
        } catch (recoverErr: unknown) { console.error(recoverErr) }
      }
      toastErrorConReporte(msg || 'Error al abrir turno')
    } finally {
      setSaving(false)
    }
  }

  const handleQrCliente = async () => {
    if (cartItems.length === 0) return
    await crearSesionQr('TARJETA')
  }

  const handleConfirmarPago = async (payload: PayloadCobroPos) => {
    if (payload.metodoPago === 'SINPE' || payload.metodoPago === 'TARJETA') {
      await crearSesionQr(payload.metodoPago)
      return
    }

    setLoadingVenta(true)
    try {
      const ventaData = await posService.crearVenta({
        ...payload,
        descuentoGlobal: descuento,
        bodegaId,
        clienteId: cliente?.id ?? null,
        items: cartItems.map(i => ({ productoId: i.id, cantidad: i.cantidad, precioUnitario: i.precio })),
      } as JsonBody) as PosVenta
      setReceipt(ventaData)
      setCartItems([])
      setDescuento(0)
      setCliente(null)
      setStep('recibo')
      showToast('Venta registrada', 'success')
    } catch (err: unknown) {
      toastErrorConReporte(mensajeErrorPos(err, 'Error al procesar la venta'))
    } finally {
      setLoadingVenta(false)
    }
  }

  const crearSesionQr = async (metodoPago: string) => {
    setLoadingVenta(true)
    try {
      const data = await posService.crearQrSesion({
        metodoPago,
        bodegaId,
        clienteId: cliente?.id ?? null,
        items: cartItems.map(i => ({
          productoId: i.id,
          cantidad: i.cantidad,
          precioUnitario: i.precio,
          nombre: i.nombre,
          imagen: i.imagen,
        })),
      } as JsonBody)
      const qr = qrDataDesdeRespuesta(data, total)
      if (!qr) {
        toastErrorConReporte('El servidor no devolvió el token del QR')
        return
      }
      setQrData(qr)
      setStep('qr')
    } catch (err: unknown) {
      toastErrorConReporte(mensajeErrorPos(err, 'Error al generar QR'))
    } finally {
      setLoadingVenta(false)
    }
  }

  const handleQrConfirmSinpe = async (
    token: string | null,
    autoConfirmed: boolean,
    numeroPedido = '—',
  ) => {
    const receiptBase = armarReceiptQr(qrData, cartItems, autoConfirmed, numeroPedido)

    if (autoConfirmed) {
      setReceipt(receiptBase)
      setQrData(null)
      setCartItems([])
      setDescuento(0)
      setStep('recibo')
      const metodo = qrData?.metodoPago
      showToast(
        metodo === 'SINPE' ? 'SINPE confirmado' : 'Pago con tarjeta confirmado',
        'success',
      )
      return
    }

    setLoadingConfirm(true)
    try {
      await posService.confirmarSinpeQr(token as string, {})
      setReceipt(receiptBase)
      setQrData(null)
      setCartItems([])
      setDescuento(0)
      setStep('recibo')
      showToast('SINPE confirmado', 'success')
    } catch (err: unknown) {
      toastErrorConReporte(mensajeErrorPos(err, 'Error al confirmar SINPE'))
    } finally {
      setLoadingConfirm(false)
    }
  }

  const handleQrCancelar = async () => {
    if (qrData?.token) {
      try { await posService.cancelarQrSesion(qrData.token) } catch (err: unknown) { console.error(err) /* best-effort cleanup */ }
    }
    setQrData(null)
    setStep('cobro')
  }

  return {
    userName,
    userRole,
    step,
    setStep,
    turno,
    saving,
    cartItems,
    descuento,
    setDescuento,
    cliente,
    setCliente,
    receipt,
    qrData,
    loadingVenta,
    loadingConfirm,
    reportePendiente,
    limpiarReportePendiente,
    subtotal,
    total,
    agregarProducto,
    setCantidad,
    setPrecio,
    quitarItem,
    nuevaVenta,
    handleAbrir,
    handleQrCliente,
    handleConfirmarPago,
    handleQrConfirmSinpe,
    handleQrCancelar,
  }
}

export type AdminPOSController = ReturnType<typeof useAdminPOS>
