import { useState, useCallback, useRef, type ChangeEvent } from 'react'
import { formatPrice } from '@/utils/format'
import { productService } from '@/services/productService'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'
import {
  DEBOUNCE_MS,
  ESTILO_INPUT,
  productosDesdeRespuesta,
  itemDesdeProducto,
  totalItems,
  type ItemAsignar,
} from './asignarHelpers'

export default function AgregarProductos({ items, onChange }: {
  items: ItemAsignar[]
  onChange: (items: ItemAsignar[]) => void
}) {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<Producto[]>([])
  const [buscando, setBuscando] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscar = useCallback((valor: string) => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    if (valor.trim().length < 2) { setResultados([]); return }
    timerRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await productService.getAll(0, 8, { q: valor.trim() })
        setResultados(productosDesdeRespuesta(data))
      } catch { setResultados([]) }
      finally { setBuscando(false) }
    }, DEBOUNCE_MS)
  }, [])

  const agregar = (prod: Producto) => {
    setQ('')
    setResultados([])
    const yaExiste = items.some(i => i.productoId === prod.id)
    if (yaExiste) {
      onChange(items.map(i => i.productoId === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      return
    }
    onChange([...items, itemDesdeProducto(prod)])
  }

  const update = (id: Id | undefined, field: 'cantidad' | 'precioUnitario', value: string) => {
    onChange(items.map(i => i.productoId === id ? { ...i, [field]: Number(value) } : i))
  }

  const quitar = (id: Id | undefined) => onChange(items.filter(i => i.productoId !== id))

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setQ(e.target.value); buscar(e.target.value) }}
          placeholder="Buscar producto por nombre…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={ESTILO_INPUT}
        />
        {buscando && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        )}
        {resultados.length > 0 && (
          <ListaResultadosProductos resultados={resultados} onAgregar={agregar} />
        )}
      </div>

      {items.length === 0 ? (
        <ListaVacia />
      ) : (
        <ListaItems items={items} onUpdate={update} onQuitar={quitar} />
      )}
    </div>
  )
}

function ListaResultadosProductos({ resultados, onAgregar }: {
  resultados: Producto[]
  onAgregar: (prod: Producto) => void
}) {
  return (
    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-10 overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      {resultados.map((p) => (
        <button type="button"
          key={p.id}
          onClick={() => onAgregar(p)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--hc-surface-2)]"
          style={{ borderBottom: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
        >
          {p.imagenUrl && (
            <img src={p.imagenUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{p.nombre}</div>
            <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>{formatPrice(p.precioVenta)}</div>
          </div>
          <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      ))}
    </div>
  )
}

function ListaVacia() {
  return (
    <div className="text-center py-10 rounded-xl" style={{ border: '1px dashed var(--hc-border)', color: 'var(--hc-muted)' }}>
      <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      </svg>
      <p className="text-sm">Buscá y agregá los productos comprados</p>
    </div>
  )
}

function ListaItems({ items, onUpdate, onQuitar }: {
  items: ItemAsignar[]
  onUpdate: (id: Id | undefined, field: 'cantidad' | 'precioUnitario', value: string) => void
  onQuitar: (id: Id | undefined) => void
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.productoId} className="flex items-center gap-3 p-3 rounded-xl"
          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
          {item.imagenUrl && (
            <img src={item.imagenUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>{item.nombre}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>Cant.</span>
              <input
                type="number" min="1" value={item.cantidad}
                onChange={(e) => onUpdate(item.productoId, 'cantidad', e.target.value)}
                className="w-14 px-2 py-1 rounded-lg text-xs text-center outline-none"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              />
              <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>Precio ₡</span>
              <input
                type="number" min="0" value={item.precioUnitario}
                onChange={(e) => onUpdate(item.productoId, 'precioUnitario', e.target.value)}
                className="w-24 px-2 py-1 rounded-lg text-xs text-center outline-none"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-semibold" style={{ color: 'var(--hc-accent)' }}>
              {formatPrice(item.cantidad * item.precioUnitario)}
            </div>
            <button type="button" onClick={() => onQuitar(item.productoId)} className="text-xs mt-1 transition-opacity hover:opacity-70" style={{ color: '#f87171' }}>
              Quitar
            </button>
          </div>
        </div>
      ))}

      <div className="flex justify-end pt-1">
        <div className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
          Total: {formatPrice(totalItems(items))}
        </div>
      </div>
    </div>
  )
}
