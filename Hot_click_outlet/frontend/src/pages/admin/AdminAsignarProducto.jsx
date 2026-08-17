import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/ui/Toast'
import { asignarService } from '@/services/asignarService'
import AsignarStepper from './asignar/AsignarStepper'
import PasoCliente from './asignar/PasoCliente'
import PasoProductos from './asignar/PasoProductos'
import PasoConfirmar from './asignar/PasoConfirmar'

export default function AdminAsignarProducto() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [paso, setPaso] = useState(0)
  const [cliente, setCliente] = useState(null)
  const [items, setItems] = useState([])
  const [metodoPago, setMp] = useState('EXTERNO')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)

  const seleccionarCliente = (u) => { setCliente(u); setPaso(1) }

  const confirmar = async () => {
    if (items.length === 0) { toast('Agregá al menos un producto', 'error'); return }
    setEnviando(true)
    try {
      await asignarService.asignarCompra({
        usuarioId: cliente.id,
        items: items.map(i => ({
          productoId:     i.productoId,
          cantidad:       i.cantidad,
          precioUnitario: i.precioUnitario,
        })),
        metodoPago,
        notas: notas || 'Compra registrada manualmente desde admin',
      })
      toast('Compra registrada exitosamente', 'success')
      navigate('/admin/pedidos')
    } catch (e) {
      toast(e.response?.data?.message ?? 'Error al registrar la compra', 'error')
    } finally { setEnviando(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Registrar compra externa</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
          Asigná productos a un cliente para que pueda escribir reseñas y acceder a garantías.
        </p>
      </div>

      <AsignarStepper paso={paso} onPaso={setPaso} />

      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <AnimatePresence mode="wait">
          {paso === 0 && (
            <PasoCliente key="p0" onSelect={seleccionarCliente} />
          )}

          {paso === 1 && (
            <PasoProductos
              key="p1"
              cliente={cliente}
              items={items}
              onChange={setItems}
              onCambiarCliente={() => setPaso(0)}
              onContinuar={() => { if (items.length > 0) setPaso(2); else toast('Agregá al menos un producto', 'error') }}
            />
          )}

          {paso === 2 && (
            <PasoConfirmar
              key="p2"
              cliente={cliente}
              items={items}
              metodoPago={metodoPago}
              onMetodoPago={setMp}
              notas={notas}
              onNotas={setNotas}
              enviando={enviando}
              onVolver={() => setPaso(1)}
              onConfirmar={confirmar}
              onCambiarCliente={() => setPaso(0)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
