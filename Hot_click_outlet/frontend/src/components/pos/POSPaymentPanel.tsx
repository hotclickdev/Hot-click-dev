import { useState, useRef } from 'react'
import { crmService } from '@/services/crmService'
import { fmt, type ClienteCobroPos, type PayloadPagoPanel } from './posCobro/posCobroHelpers'
import PosMetodosPago from './posCobro/PosMetodosPago'
import PosCamposMetodo from './posCobro/PosCamposMetodo'
import PosClienteBusqueda from './posCobro/PosClienteBusqueda'
import CloseIcon from '@/components/ui/CloseIcon'

export default function POSPaymentPanel({ total, onConfirm, onClose, loading }: {
  total: number
  onConfirm: (payload: PayloadPagoPanel) => void
  onClose: () => void
  loading?: boolean
}) {
  const [metodoPago, setMetodoPago]       = useState('EFECTIVO')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [confirmSinpe, setConfirmSinpe]   = useState('')
  const [clienteQuery, setClienteQuery]   = useState('')
  const [sugerencias, setSugerencias]     = useState<ClienteCobroPos[]>([])
  const [clienteId, setClienteId]         = useState<number | string | null>(null)
  const [clienteInfo, setClienteInfo]     = useState<ClienteCobroPos | null>(null)
  const [buscando, setBuscando]           = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const montoRecibidoNum = Number.parseInt(montoRecibido.replace(/\D/g, '') || '0')
  const vuelto = metodoPago === 'EFECTIVO' && montoRecibidoNum > 0
    ? montoRecibidoNum - total
    : null
  const puedeConfirmar = metodoPago !== 'EFECTIVO' ||
    (montoRecibidoNum > 0 && montoRecibidoNum >= total)

  const handleConfirmar = () => {
    onConfirm({
      clienteId: clienteId ?? null,
      metodoPago,
      montoRecibido: metodoPago === 'EFECTIVO'
        ? Number.parseInt(montoRecibido.replace(/\D/g, '') || '0') : null,
      confirmacionSinpe: metodoPago === 'SINPE' ? confirmSinpe : null,
    })
  }

  const buscarCliente = (q: string) => {
    clearTimeout(timerRef.current as ReturnType<typeof setTimeout>)
    setClienteQuery(q)
    if (!q.trim() || q.trim().length < 2) { setSugerencias([]); return }
    setBuscando(true)
    timerRef.current = setTimeout(() => {
      crmService.buscarClientes(q.trim())
        .then((data) => setSugerencias(data as ClienteCobroPos[]))
        .catch((err: unknown) => {
          console.error(err)
          setSugerencias([])
        })
        .finally(() => setBuscando(false))
    }, 300)
  }

  const seleccionarCliente = (c: ClienteCobroPos) => {
    setClienteId(c.id)
    setClienteInfo(c)
    setClienteQuery(`${c.nombre} ${c.apellidoPaterno}`.trim())
    setSugerencias([])
  }

  const limpiarCliente = () => {
    setClienteId(null)
    setClienteInfo(null)
    setClienteQuery('')
    setSugerencias([])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>Cobrar venta</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
            <CloseIcon />
          </button>
        </div>

        <div className="rounded-xl p-4 text-center"
          style={{ backgroundColor: 'rgba(23,71,168,0.1)', border: '1px solid rgba(23,71,168,0.2)' }}>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Total a cobrar</p>
          <p className="text-3xl font-black mt-1" style={{ color: 'var(--hc-accent)' }}>₡{fmt(total)}</p>
        </div>

        <PosMetodosPago metodoPago={metodoPago} setMetodoPago={setMetodoPago} />

        <PosCamposMetodo
          metodoPago={metodoPago}
          montoRecibido={montoRecibido}
          setMontoRecibido={setMontoRecibido}
          vuelto={vuelto}
          confirmSinpe={confirmSinpe}
          setConfirmSinpe={setConfirmSinpe}
        />

        <PosClienteBusqueda
          clienteQuery={clienteQuery}
          buscarCliente={buscarCliente}
          clienteId={clienteId}
          limpiarCliente={limpiarCliente}
          sugerencias={sugerencias}
          seleccionarCliente={seleccionarCliente}
          buscando={buscando}
          clienteInfo={clienteInfo}
        />

        <button type="button" onClick={handleConfirmar} disabled={!puedeConfirmar || loading}
          className="w-full py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-40"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          {loading ? 'Procesando…' : `Confirmar — ₡${fmt(total)}`}
        </button>
      </div>
    </div>
  )
}
