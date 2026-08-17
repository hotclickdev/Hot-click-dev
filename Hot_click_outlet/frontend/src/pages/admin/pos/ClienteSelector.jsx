import { useState, useEffect, useRef } from 'react'
import { crmService } from '@/services/crmService'
import { useToast } from '@/components/ui/Toast'
import { CloseIcon } from './posIcons'

export default function ClienteSelector({ cliente, onChange }) {
  const { showToast } = useToast()
  const [open, setOpen]     = useState(false)
  const [tab, setTab]       = useState('buscar') // 'buscar' | 'nuevo'
  const [query, setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre]   = useState('')
  const [telefono, setTelefono] = useState('')
  const [creando, setCreando] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!query || query.trim().length < 2) return
    const t = setTimeout(() => {
      setLoading(true)
      crmService.buscarClientes(query.trim())
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const listaClientes = query.trim().length < 2 ? [] : results

  const seleccionar = (c) => {
    onChange({ id: c.id, nombre: c.nombre || c.correo || 'Cliente' })
    setOpen(false); setQuery(''); setResults([])
  }

  const crear = async () => {
    if (!nombre.trim()) return
    setCreando(true)
    try {
      const nuevo = await crmService.crearCliente({ nombre: nombre.trim(), telefono: telefono.trim() })
      seleccionar(nuevo)
      setNombre(''); setTelefono('')
      showToast('Cliente registrado', 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al registrar cliente', 'error')
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-colors"
        style={{
          backgroundColor: cliente ? 'rgba(23,71,168,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${cliente ? 'rgba(23,71,168,0.3)' : 'rgba(255,255,255,0.08)'}`,
          color: cliente ? '#7aa3ff' : 'rgba(255,255,255,0.4)',
        }}>
        <span className="flex items-center gap-1.5 truncate">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <span className="truncate font-medium">{cliente ? cliente.nombre : 'Cliente: Mostrador'}</span>
        </span>
        {cliente && (
          <span onClick={(e) => { e.stopPropagation(); onChange(null) }}
            className="shrink-0 opacity-60 hover:opacity-100">
            <CloseIcon />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1.5 rounded-xl overflow-hidden shadow-xl"
          style={{ backgroundColor: '#15151d', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {[{ id: 'buscar', label: 'Buscar' }, { id: 'nuevo', label: '+ Nuevo' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 py-2 text-xs font-semibold transition-colors"
                style={{ color: tab === t.id ? '#7aa3ff' : 'rgba(255,255,255,0.35)' }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'buscar' ? (
            <div className="p-2">
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Nombre, correo o teléfono…"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }} />
              <div className="max-h-40 overflow-y-auto mt-1.5">
                {loading && <p className="text-xs text-center py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Buscando…</p>}
                {!loading && query.trim().length >= 2 && results.length === 0 && (
                  <p className="text-xs text-center py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin resultados</p>
                )}
                {listaClientes.map(c => (
                  <button key={c.id} onClick={() => seleccionar(c)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white/5 transition-colors">
                    <span className="font-medium" style={{ color: '#fff' }}>{c.nombre} {c.apellidoPaterno}</span>
                    <span className="ml-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.telefono}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del cliente"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }} />
              <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Teléfono (opcional)"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }} />
              <button onClick={crear} disabled={!nombre.trim() || creando}
                className="w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                {creando ? 'Guardando…' : 'Registrar y usar'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
