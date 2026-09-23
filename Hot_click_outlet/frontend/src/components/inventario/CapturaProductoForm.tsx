import { useState } from 'react'
import type { InventarioLookup, LineaRequest } from '@/services/inventarioPaqueteService'

type Props = {
  lookup: InventarioLookup | null
  barcode: string
  onSubmit: (linea: LineaRequest, foto?: File | null) => Promise<void>
  onCancel: () => void
  busy?: boolean
}

function camposDesdeLookup(lookup: InventarioLookup | null, barcode: string) {
  const prefill = lookup?.match === 'EN_MAESTRO' || lookup?.match === 'EN_EMPRESA'
  return {
    nombre: prefill ? (lookup?.nombre ?? '') : '',
    precioVenta: lookup?.match === 'EN_EMPRESA' ? (lookup?.precioVenta ?? 1) : 1,
    precioCompra: 0,
    stock: 1,
    marcaTexto: prefill ? (lookup?.marcaTexto ?? '') : '',
    categoriaTexto: '',
    imagenUrl: prefill ? (lookup?.imagenUrl ?? '') : '',
    barcode,
  }
}

/** Formulario corto tras escanear: pide precio/stock; prefija ficha si hay maestro. */
export default function CapturaProductoForm({ lookup, barcode, onSubmit, onCancel, busy }: Props) {
  const base = camposDesdeLookup(lookup, barcode)
  const [nombre, setNombre] = useState(base.nombre)
  const [precioVenta, setPrecioVenta] = useState(base.precioVenta)
  const [precioCompra, setPrecioCompra] = useState(base.precioCompra)
  const [stock, setStock] = useState(base.stock)
  const [marcaTexto, setMarcaTexto] = useState(base.marcaTexto)
  const [categoriaTexto, setCategoriaTexto] = useState(base.categoriaTexto)
  const [foto, setFoto] = useState<File | null>(null)
  const soloStock = lookup?.match === 'EN_PAQUETE'
  const fichaPrefijada = lookup?.match === 'EN_MAESTRO' || lookup?.match === 'EN_EMPRESA'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() && !soloStock) return
    await onSubmit({
      barcode,
      nombre: nombre.trim() || lookup?.nombre || barcode,
      precioVenta: Number(precioVenta) || 1,
      precioCompra: Number(precioCompra) || 0,
      stock: Number(stock) || 1,
      marcaTexto: marcaTexto || null,
      categoriaTexto: categoriaTexto || null,
      imagenUrl: base.imagenUrl || null,
    }, foto)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl p-4"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>BC: {barcode}</p>
        {lookup?.match && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)' }}>
            {lookup.match}
          </span>
        )}
      </div>
      {fichaPrefijada && (
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          Ficha prefijada del catálogo. Solo confirmá precio y stock de este negocio.
        </p>
      )}
      {!soloStock && (
        <>
          <label className="block text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Nombre</label>
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Precio venta ₡</label>
              <input type="number" min={1} value={precioVenta} onChange={(e) => setPrecioVenta(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Precio compra ₡</label>
              <input type="number" min={0} value={precioCompra} onChange={(e) => setPrecioCompra(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Marca</label>
              <input value={marcaTexto} onChange={(e) => setMarcaTexto(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Categoría</label>
              <input value={categoriaTexto} onChange={(e) => setCategoriaTexto(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Foto</label>
            <input type="file" accept="image/*" capture="environment"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              className="text-xs" style={{ color: 'var(--hc-muted)' }} />
          </div>
        </>
      )}
      <div>
        <label className="block text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Stock</label>
        <input type="number" min={1} value={stock} onChange={(e) => setStock(Number(e.target.value))}
          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
          style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={busy}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
          style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
          Cancelar
        </button>
        <button type="submit" disabled={busy}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white"
          style={{ backgroundColor: 'var(--hc-accent)' }}>
          {busy ? 'Guardando…' : soloStock ? 'Sumar stock' : 'Agregar'}
        </button>
      </div>
    </form>
  )
}
