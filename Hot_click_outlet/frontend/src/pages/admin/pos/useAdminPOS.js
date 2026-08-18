import { useState, useEffect, useCallback } from 'react'
import { posService } from '@/services/posService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import usePosStore from '@/store/posStore'
import { agregarProductoAlCarrito } from './posHelpers'

function armarReceiptQr(qrData, cartItems, autoConfirmed) {
  return {
    totalPedido:  qrData?.total,
    metodoPago:   autoConfirmed ? qrData?.metodoPago : 'SINPE',
    numeroPedido: '—',
    items: cartItems.map(i => ({
      producto: { nombreProducto: i.nombre },
      cantidad: i.cantidad,
      subtotalItem: i.precio * i.cantidad,
    })),
  }
}

/**
 * Estado y handlers del POS — bit-idéntico al orquestador original.
 */
export function useAdminPOS() {
  const { showToast } = useToast()
  const userName = useAuthStore(s => s.userName)
  const userRole = useAuthStore(s => s.userRole)
  const { bodegaId } = usePosStore()

  const [step, setStep]   = useState('loading')
  const [turno, setTurno] = useState(null)
  const [saving, setSaving] = useState(false)

  const [cartItems, setCartItems]   = useState([])
  const [descuento, setDescuento]   = useState(0)
  const [cliente, setCliente]       = useState(null) // { id, nombre } | null = mostrador
  const [receipt, setReceipt]       = useState(null)
  const [qrData, setQrData]         = useState(null)
  const [loadingVenta, setLoadingVenta]     = useState(false)
  const [loadingConfirm, setLoadingConfirm] = useState(false)
  const [showCierre, setShowCierre]         = useState(false)
  const [montoFinalCierre, setMontoFinalCierre] = useState(0)

  useEffect(() => {
    const init = async () => {
      try {
        // posService ya hace .then(r => r.data), así que res ES el turno directamente
        const t = await posService.getCajaActiva()
        setTurno(t ?? null)
        setStep(t ? 'venta' : 'apertura')
      } catch {
        // 404 = no hay turno activo; otros errores muestran apertura igual
        setStep('apertura')
      }
    }
    init()
  }, [])

  const agregarProducto = useCallback((producto) => {
    setCartItems(prev => agregarProductoAlCarrito(prev, producto))
  }, [])

  const setCantidad = (id, val) => {
    const n = Math.max(1, Number.parseInt(val) || 1)
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, cantidad: n } : i))
  }

  const setPrecio = (id, val) => {
    const n = Number.parseInt(String(val).replace(/\D/g, ''))
    if (!Number.isNaN(n)) setCartItems(prev => prev.map(i => i.id === id ? { ...i, precio: n } : i))
  }

  const quitarItem = (id) => setCartItems(prev => prev.filter(i => i.id !== id))

  const nuevaVenta = () => {
    setCartItems([])
    setDescuento(0)
    setCliente(null)
    setReceipt(null)
    setQrData(null)
    setStep('venta')
  }

  const subtotal = cartItems.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const total    = Math.max(0, subtotal - descuento)

  const handleAbrir = async (montoInicial) => {
    setSaving(true)
    try {
      // posService ya hace .then(r => r.data)
      const turnoData = await posService.abrirCaja({ montoInicial })
      setTurno(turnoData)
      setStep('venta')
      showToast('Turno abierto — ¡a vender!', 'success')
    } catch (err) {
      const msg = err?.response?.data?.message ?? ''
      // Si ya existe un turno abierto, obtenerlo en vez de bloquearse
      if (msg.toLowerCase().includes('turno') || msg.toLowerCase().includes('caja') || err?.response?.status === 409) {
        try {
          const t = await posService.getCajaActiva()
          if (t) { setTurno(t); setStep('venta'); showToast('Turno existente recuperado', 'info'); return }
        } catch (recoverErr) { console.error(recoverErr) }
      }
      showToast(msg || 'Error al abrir turno', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCerrarTurno = async () => {
    if (!turno?.id) return
    setSaving(true)
    try {
      await posService.cerrarCaja(turno.id, { montoDeclarado: montoFinalCierre })
      setTurno(null)
      setShowCierre(false)
      setMontoFinalCierre(0)
      setCartItems([])
      setDescuento(0)
      setStep('apertura')
      showToast('Turno cerrado correctamente', 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al cerrar turno', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleQrCliente = async () => {
    if (cartItems.length === 0) return
    setLoadingVenta(true)
    try {
      const data = await posService.crearQrSesion({
        metodoPago: 'TARJETA',
        bodegaId,
        items: cartItems.map(i => ({ productoId: i.id, cantidad: i.cantidad, precioUnitario: i.precio, nombre: i.nombre })),
      })
      setQrData({
        token:      data.token,
        metodoPago: data.metodoPago ?? 'TARJETA',
        total:      data.total ?? total,
        sinpeNumero: data.sinpeNumero ?? '',
      })
      setStep('qr')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al generar QR', 'error')
    } finally {
      setLoadingVenta(false)
    }
  }

  const handleConfirmarPago = async (payload) => {
    if (payload.metodoPago === 'SINPE' || payload.metodoPago === 'TARJETA') {
      setLoadingVenta(true)
      try {
        const data = await posService.crearQrSesion({
          metodoPago: payload.metodoPago,
          bodegaId,
          clienteId: cliente?.id ?? null,
          items: cartItems.map(i => ({ productoId: i.id, cantidad: i.cantidad, precioUnitario: i.precio, nombre: i.nombre })),
        })
        setQrData({
          token:       data.token,
          metodoPago:  data.metodoPago,
          total:       data.total ?? total,
          sinpeNumero: data.sinpeNumero ?? '',
        })
        setStep('qr')
      } catch (err) {
        showToast(err?.response?.data?.message ?? 'Error al generar QR', 'error')
      } finally {
        setLoadingVenta(false)
      }
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
      })
      setReceipt(ventaData)
      setCartItems([])
      setDescuento(0)
      setCliente(null)
      setStep('recibo')
      showToast('✓ Venta registrada', 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al procesar la venta', 'error')
    } finally {
      setLoadingVenta(false)
    }
  }

  const handleQrConfirmSinpe = async (token, autoConfirmed) => {
    const receiptBase = armarReceiptQr(qrData, cartItems, autoConfirmed)

    if (autoConfirmed) {
      setReceipt(receiptBase)
      setQrData(null)
      setCartItems([])
      setDescuento(0)
      setStep('recibo')
      showToast('✓ Pago con tarjeta confirmado', 'success')
      return
    }

    setLoadingConfirm(true)
    try {
      await posService.confirmarSinpeQr(token, {})
      setReceipt(receiptBase)
      setQrData(null)
      setCartItems([])
      setDescuento(0)
      setStep('recibo')
      showToast('✓ SINPE confirmado', 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al confirmar SINPE', 'error')
    } finally {
      setLoadingConfirm(false)
    }
  }

  const handleQrCancelar = async () => {
    if (qrData?.token) {
      try { await posService.cancelarQrSesion(qrData.token) } catch (err) { console.error(err) /* best-effort cleanup */ }
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
    showCierre,
    setShowCierre,
    setMontoFinalCierre,
    subtotal,
    total,
    agregarProducto,
    setCantidad,
    setPrecio,
    quitarItem,
    nuevaVenta,
    handleAbrir,
    handleCerrarTurno,
    handleQrCliente,
    handleConfirmarPago,
    handleQrConfirmSinpe,
    handleQrCancelar,
  }
}
