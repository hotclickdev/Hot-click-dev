import { useState, useEffect, useCallback } from 'react'
import { posService } from '@/services/posService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import usePosStore from '@/store/posStore'
import ConteoEfectivo from './ConteoEfectivo'
import POSHeader from './POSHeader'
import StepApertura from './StepApertura'
import StepVenta from './StepVenta'
import StepCobro from './StepCobro'
import StepQR from './StepQR'
import StepRecibo from './StepRecibo'
import { agregarProductoAlCarrito } from './posHelpers'

export default function AdminPOS() {
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
        } catch { /* ignore */ }
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
        sinpeNumero: data.sinpeNumero ?? '8666-7888',
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
          sinpeNumero: data.sinpeNumero ?? '8666-7888',
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
    const receiptBase = {
      totalPedido:  qrData?.total,
      metodoPago:   autoConfirmed ? qrData?.metodoPago : 'SINPE',
      numeroPedido: '—',
      items: cartItems.map(i => ({
        producto: { nombreProducto: i.nombre },
        cantidad: i.cantidad,
        subtotalItem: i.precio * i.cantidad,
      })),
    }

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
      try { await posService.cancelarQrSesion(qrData.token) } catch { /* best-effort cleanup */ }
    }
    setQrData(null)
    setStep('cobro')
  }

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#08080c' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: '#08080c', fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace" }}>
      <POSHeader userName={userName} turno={turno} step={step} onCerrarTurno={() => setShowCierre(true)}
        mostrarVolverSistema={userRole !== 'CAJERO'} />

      {/* Modal cerrar turno */}
      {showCierre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ backgroundColor: '#0c0c12', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <h2 className="text-xl font-black mb-1" style={{ color: '#fff' }}>Cerrar turno</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Contá el efectivo final de la caja antes de cerrar</p>
            </div>
            <ConteoEfectivo label="Efectivo en caja al cierre" onTotal={setMontoFinalCierre} />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowCierre(false)}
                className="py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button onClick={handleCerrarTurno} disabled={saving}
                className="py-3 rounded-xl text-sm font-black disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff' }}>
                {saving ? 'Cerrando…' : 'Cerrar turno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'apertura' && <StepApertura onAbrir={handleAbrir} loading={saving} />}

      {step === 'venta' && (
        <StepVenta
          cartItems={cartItems}
          onAdd={agregarProducto}
          onSetCantidad={setCantidad}
          onSetPrecio={setPrecio}
          onRemove={quitarItem}
          descuento={descuento}
          onSetDescuento={setDescuento}
          subtotal={subtotal}
          total={total}
          onNueva={nuevaVenta}
          onCobrar={() => setStep('cobro')}
          onQrCliente={handleQrCliente}
          loadingQr={loadingVenta}
          cliente={cliente}
          onSetCliente={setCliente}
        />
      )}

      {step === 'cobro' && (
        <StepCobro
          total={total}
          cartItems={cartItems}
          descuento={descuento}
          onBack={() => setStep('venta')}
          onConfirmar={handleConfirmarPago}
          loading={loadingVenta}
        />
      )}

      {step === 'qr' && qrData && (
        <StepQR
          qrData={qrData}
          onConfirmSinpe={handleQrConfirmSinpe}
          onCancelar={handleQrCancelar}
          loadingConfirm={loadingConfirm}
        />
      )}

      {step === 'recibo' && receipt && (
        <StepRecibo venta={receipt} userName={userName} onNueva={nuevaVenta} />
      )}
    </div>
  )
}
