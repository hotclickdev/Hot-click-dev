import { motion } from 'framer-motion'
import ClienteBadge from './ClienteBadge'
import ResumenItems from './ResumenItems'
import { ESTILO_INPUT, METODOS_PAGO } from './asignarHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'

/**
 * @param {{
 *   cliente: object | null,
 *   items: object[],
 *   metodoPago: string,
 *   onMetodoPago: (v: string) => void,
 *   notas: string,
 *   onNotas: (v: string) => void,
 *   enviando: boolean,
 *   onVolver: () => void,
 *   onConfirmar: () => void,
 *   onCambiarCliente: () => void,
 * }} props
 */
export default function PasoConfirmar({
  cliente,
  items,
  metodoPago,
  onMetodoPago,
  notas,
  onNotas,
  enviando,
  onVolver,
  onConfirmar,
  onCambiarCliente,
}) {
  return (
    <motion.div key="p2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold" style={{ color: 'var(--hc-text)' }}>Paso 3 — Confirmar</h2>
        <ClienteBadge cliente={cliente} onCambiar={onCambiarCliente} />
      </div>

      <ResumenItems items={items} />

      <div className="space-y-1">
        <label htmlFor="asignar-metodo-pago" className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Método de pago</label>
        <select
          id="asignar-metodo-pago"
          value={metodoPago}
          onChange={(e) => onMetodoPago(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={ESTILO_INPUT}
        >
          {METODOS_PAGO.map(m => (
            <option key={m} value={m}>{m.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="asignar-notas" className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Notas internas (opcional)</label>
        <textarea
          id="asignar-notas"
          value={notas}
          onChange={(e) => onNotas(e.target.value)}
          rows={2}
          placeholder="Ej: Comprado en feria, pago por Instagram…"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={ESTILO_INPUT}
        />
      </div>

      <div className="flex justify-between items-center pt-1">
        <button type="button" onClick={onVolver} className="text-sm transition-opacity hover:opacity-70" style={{ color: 'var(--hc-muted)' }}>
          <TextoFlecha dir="atras">Volver</TextoFlecha>
        </button>
        <button type="button"
          onClick={onConfirmar}
          disabled={enviando}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
          style={{ backgroundColor: '#10b981', color: '#fff' }}
        >
          {enviando ? 'Registrando…' : 'Registrar compra'}
        </button>
      </div>
    </motion.div>
  )
}
