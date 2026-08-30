import { motion } from 'framer-motion'
import ClienteBadge from './ClienteBadge'
import AgregarProductos from './AgregarProductos'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { ClienteAsignar, ItemAsignar } from './asignarHelpers'

export default function PasoProductos({ cliente, items, onChange, onCambiarCliente, onContinuar }: {
  cliente: ClienteAsignar | null
  items: ItemAsignar[]
  onChange: (items: ItemAsignar[]) => void
  onCambiarCliente: () => void
  onContinuar: () => void
}) {
  return (
    <motion.div key="p1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--hc-text)' }}>Paso 2 — Agregar productos</h2>
        <ClienteBadge cliente={cliente} onCambiar={onCambiarCliente} />
      </div>
      <AgregarProductos items={items} onChange={onChange} />
      <div className="flex justify-end mt-5">
        <button type="button"
          onClick={onContinuar}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
        >
          <TextoFlecha>Continuar</TextoFlecha>
        </button>
      </div>
    </motion.div>
  )
}
