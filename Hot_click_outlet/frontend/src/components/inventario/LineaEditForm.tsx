import { useState } from 'react'
import type { LineaRequest, PaqueteLinea } from '@/services/inventarioPaqueteService'

type LineaEstado = 'LISTO' | 'CONFLICTO'

const inputStyle = {
  backgroundColor: 'var(--hc-bg)',
  border: '1px solid var(--hc-border)',
  color: 'var(--hc-text)',
} as const

type Props = {
  linea: PaqueteLinea
  busy?: boolean
  onSave: (body: LineaRequest) => Promise<void>
  onCancel: () => void
}

/** Formulario inline para editar una línea de paquete (tablet/admin detalle). */
export default function LineaEditForm({ linea, busy, onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState(linea.nombre)
  const [precioVenta, setPrecioVenta] = useState(linea.precioVenta)
  const [precioCompra, setPrecioCompra] = useState(linea.precioCompra)
  const [stock, setStock] = useState(linea.stock)
  const [estado, setEstado] = useState<LineaEstado>(
    linea.estado === 'CONFLICTO' ? 'CONFLICTO' : 'LISTO',
  )
  const [notasConflicto, setNotasConflicto] = useState(linea.notasConflicto ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    await onSave({
      nombre: nombre.trim(),
      precioVenta: Number(precioVenta) || 1,
      precioCompra: Number(precioCompra) || 0,
      stock: Number(stock) || 0,
      estado,
      notasConflicto: notasConflicto.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 space-y-2">
      <p className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>
        {linea.barcode ?? 'sin BC'} · {linea.sku ?? 'sin SKU'}
      </p>
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Nombre</label>
        <input required value={nombre} onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
          style={inputStyle} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Precio venta ₡</label>
          <input type="number" min={1} value={precioVenta} onChange={(e) => setPrecioVenta(Number(e.target.value))}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Precio compra ₡</label>
          <input type="number" min={0} value={precioCompra} onChange={(e) => setPrecioCompra(Number(e.target.value))}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={inputStyle} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Stock</label>
          <input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value as LineaEstado)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={inputStyle}>
            <option value="LISTO">LISTO</option>
            <option value="CONFLICTO">CONFLICTO</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Notas conflicto</label>
        <textarea value={notasConflicto} onChange={(e) => setNotasConflicto(e.target.value)} rows={2}
          className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
          style={inputStyle} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={busy}
          className="flex-1 rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
          style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
          Cancelar
        </button>
        <button type="submit" disabled={busy}
          className="flex-1 rounded-xl py-2 text-sm font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--hc-accent)' }}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
