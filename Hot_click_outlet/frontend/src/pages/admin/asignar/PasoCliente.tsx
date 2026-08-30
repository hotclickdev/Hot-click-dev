import { motion } from 'framer-motion'
import BuscarCliente from './BuscarCliente'
import type { ClienteAsignar } from './asignarHelpers'

export default function PasoCliente({ onSelect }: { onSelect: (usuario: ClienteAsignar) => void }) {
  return (
    <motion.div key="p0" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
      <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--hc-text)' }}>Paso 1 — Seleccionar cliente</h2>
      <BuscarCliente onSelect={onSelect} />
    </motion.div>
  )
}
