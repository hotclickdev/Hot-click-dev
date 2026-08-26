import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { productService } from '@/services/productService'
import { crmService } from '@/services/crmService'
import api from '@/services/api'
import {
  mapearProductosBusqueda,
  mapearPedidosBusqueda,
  mapearClientesBusqueda,
  queryParecePedido,
} from './globalSearchQuery'
import TrustGlyph from '@/components/ui/TrustGlyph'

function ResultGroup({ title, items, onSelect }) {
  if (!items.length) return null
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5"
        style={{ color: 'var(--hc-muted)' }}>{title}</p>
      {items.map((item, i) => (
        <button type="button" key={i} onClick={() => onSelect(item)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05] rounded-lg"
          style={{ color: 'var(--hc-text)' }}>
          <span className="w-6 h-6 flex items-center justify-center rounded-md shrink-0"
            style={{ backgroundColor: `${item.iconColor ?? 'rgba(23,71,168,'}0.15)`, color: item.iconColor ?? 'var(--hc-accent)' }}>
            <TrustGlyph tipo={item.icono} className="w-3.5 h-3.5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>{item.label}</p>
            {item.sub && <p className="text-xs truncate" style={{ color: 'var(--hc-muted)' }}>{item.sub}</p>}
          </div>
          {item.meta && <span className="text-xs shrink-0" style={{ color: 'var(--hc-muted)' }}>{item.meta}</span>}
        </button>
      ))}
    </div>
  )
}

export default function GlobalSearch({ open, onClose }) {
  const navigate   = useNavigate()
  const [q, setQ]  = useState('')
  const [results, setResults] = useState({ productos: [], pedidos: [], clientes: [] })
  const [loading, setLoading] = useState(false)
  const inputRef  = useRef(null)
  const timerRef  = useRef(null)

  useEffect(() => {
    if (open) { setQ(''); setResults({ productos: [], pedidos: [], clientes: [] }); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onClose() }
      if (e.key === 'Escape' && open) onClose()
    }
    globalThis.addEventListener('keydown', handler)
    return () => globalThis.removeEventListener('keydown', handler)
  }, [open, onClose])

  const buscar = useCallback((query) => {
    clearTimeout(timerRef.current)
    if (!query.trim() || query.trim().length < 2) {
      setResults({ productos: [], pedidos: [], clientes: [] })
      return
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const [prods, clientes] = await Promise.allSettled([
          productService.buscar(query),
          crmService.buscarClientes(query),
        ])
        const prodList = prods.status === 'fulfilled' ? (prods.value ?? []) : []
        const clienList = clientes.status === 'fulfilled' ? (clientes.value ?? []) : []
        const pedidoList = await buscarPedidoSiAplica(query)
        setResults({
          productos: mapearProductosBusqueda(prodList),
          pedidos: mapearPedidosBusqueda(pedidoList),
          clientes: mapearClientesBusqueda(clienList),
        })
      } catch (err) {
        console.error('[busqueda] falló la búsqueda global', err)
      } finally {
        setLoading(false)
      }
    }, 250)
  }, [])

  const handleChange = (e) => { setQ(e.target.value); buscar(e.target.value) }

  const handleSelect = (item) => {
    onClose()
    if (item.path) navigate(item.path)
  }

  const totalResults = results.productos.length + results.pedidos.length + results.clientes.length
  const hasQuery = q.trim().length >= 2

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      role="presentation" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>

        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}
            viewBox="0 0 24 24" style={{ color: 'var(--hc-muted)' }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={handleChange}
            placeholder="Buscar productos, pedidos, clientes…"
            className="flex-1 text-base bg-transparent outline-none"
            style={{ color: 'var(--hc-text)' }}
          />
          {loading && (
            <div className="w-4 h-4 border-2 rounded-full animate-spin shrink-0"
              style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
          )}
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>Esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!hasQuery && (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>
              Escribí al menos 2 caracteres para buscar
            </div>
          )}
          {hasQuery && !loading && totalResults === 0 && (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>
              Sin resultados para &quot;{q}&quot;
            </div>
          )}
          {totalResults > 0 && (
            <div className="space-y-1">
              <ResultGroup title="Productos" items={results.productos} onSelect={handleSelect}/>
              <ResultGroup title="Pedidos"   items={results.pedidos}   onSelect={handleSelect}/>
              <ResultGroup title="Clientes"  items={results.clientes}  onSelect={handleSelect}/>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t flex items-center gap-3 text-[10px]"
          style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'var(--hc-muted)' }}>
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>Esc cerrar</span>
        </div>
      </div>
    </div>
  )
}

async function buscarPedidoSiAplica(query) {
  if (!queryParecePedido(query)) return []
  try {
    const res = await api.get(`/pedidos/${query.trim()}`)
    const p = res.data?.data ?? res.data
    return p?.id ? [p] : []
  } catch (err) {
    console.debug('[busqueda] pedido no encontrado', err)
    return []
  }
}
