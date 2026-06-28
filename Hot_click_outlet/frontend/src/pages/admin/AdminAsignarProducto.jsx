import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/services/api'
import { useToast } from '@/components/ui/Toast'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

// ── Paso 1: Buscar o crear cliente ──────────────────────────────────────────

function BuscarCliente({ onSelect }) {
  const [q, setQ]               = useState('')
  const [resultados, setRes]    = useState([])
  const [buscando, setBuscando] = useState(false)
  const [modo, setModo]         = useState('buscar') // 'buscar' | 'crear'
  const [form, setForm]         = useState({ nombre: '', apellido: '', correo: '', telefono: '' })
  const [creando, setCreando]   = useState(false)
  const { toast }               = useToast()
  const timerRef                = useRef(null)

  const buscar = useCallback((valor) => {
    clearTimeout(timerRef.current)
    if (valor.trim().length < 2) { setRes([]); return }
    timerRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await api.get(`/admin/asignar/buscar-cliente?q=${encodeURIComponent(valor.trim())}`)
        setRes(Array.isArray(data?.data) ? data.data : [])
      } catch { setRes([]) }
      finally { setBuscando(false) }
    }, 350)
  }, [])

  const handleQ = (e) => { setQ(e.target.value); buscar(e.target.value) }

  const crear = async () => {
    if (!form.nombre.trim()) { toast('El nombre es requerido', 'error'); return }
    if (!form.correo.trim() && !form.telefono.trim()) { toast('Correo o teléfono requerido', 'error'); return }
    setCreando(true)
    try {
      const { data } = await api.post('/admin/asignar/crear-cliente', form)
      toast('Cliente creado correctamente', 'success')
      onSelect(data?.data ?? data)
    } catch (e) {
      toast(e.response?.data?.message ?? 'Error al crear cliente', 'error')
    } finally { setCreando(false) }
  }

  return (
    <div className="space-y-4">
      {/* Tabs buscar / crear */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
        {[['buscar', 'Buscar cliente existente'], ['crear', 'Crear cliente nuevo']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setModo(key)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: modo === key ? 'var(--hc-accent)' : 'transparent',
              color: modo === key ? '#fff' : 'var(--hc-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {modo === 'buscar' ? (
          <motion.div key="buscar" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={q}
                onChange={handleQ}
                placeholder="Nombre, correo o teléfono…"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  backgroundColor: 'var(--hc-surface-2)',
                  border: '1px solid var(--hc-border)',
                  color: 'var(--hc-text)',
                }}
              />
              {buscando && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
              )}
            </div>

            {resultados.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
                {resultados.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => onSelect(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--hc-surface-2)]"
                    style={{ borderBottom: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)' }}>
                      {u.nombre?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{u.nombre} {u.apellidoPaterno}</div>
                      <div className="text-xs truncate" style={{ color: 'var(--hc-muted)' }}>
                        {u.correo} {u.telefono ? `· ${u.telefono}` : ''}
                      </div>
                    </div>
                    <svg className="w-4 h-4 shrink-0 ml-auto" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {q.trim().length >= 2 && !buscando && resultados.length === 0 && (
              <div className="text-sm text-center py-4" style={{ color: 'var(--hc-muted)' }}>
                Sin resultados. Podés{' '}
                <button onClick={() => setModo('crear')} className="underline" style={{ color: 'var(--hc-accent)' }}>
                  crear el cliente
                </button>.
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="crear" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'nombre',   label: 'Nombre *',   placeholder: 'Juan', type: 'text' },
                { key: 'apellido', label: 'Apellido',   placeholder: 'Pérez', type: 'text' },
                { key: 'correo',   label: 'Correo',     placeholder: 'juan@ejemplo.com', type: 'email' },
                { key: 'telefono', label: 'Teléfono',   placeholder: '88887777', type: 'tel' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--hc-surface-2)',
                      border: '1px solid var(--hc-border)',
                      color: 'var(--hc-text)',
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              * Se requiere correo o teléfono. El cliente puede vincular su cuenta después con Google/Apple.
            </p>
            <button
              onClick={crear}
              disabled={creando}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
            >
              {creando ? 'Creando…' : 'Crear y seleccionar cliente'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Paso 2: Agregar productos ───────────────────────────────────────────────

function AgregarProductos({ items, onChange }) {
  const [q, setQ]               = useState('')
  const [resultados, setRes]    = useState([])
  const [buscando, setBuscando] = useState(false)
  const timerRef                = useRef(null)

  const buscar = useCallback((valor) => {
    clearTimeout(timerRef.current)
    if (valor.trim().length < 2) { setRes([]); return }
    timerRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await api.get(`/productos?q=${encodeURIComponent(valor.trim())}&page=0&size=8`)
        const lista = data?.content ?? data?.data?.content ?? []
        setRes(lista)
      } catch { setRes([]) }
      finally { setBuscando(false) }
    }, 350)
  }, [])

  const agregar = (prod) => {
    setQ(''); setRes([])
    const yaExiste = items.some(i => i.productoId === prod.id)
    if (yaExiste) {
      onChange(items.map(i => i.productoId === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i))
    } else {
      onChange([...items, {
        productoId:     prod.id,
        nombre:         prod.nombre,
        imagenUrl:      prod.imagenUrl,
        cantidad:       1,
        precioUnitario: prod.precioVenta ?? 0,
      }])
    }
  }

  const update = (id, field, value) => {
    onChange(items.map(i => i.productoId === id ? { ...i, [field]: Number(value) } : i))
  }

  const quitar = (id) => onChange(items.filter(i => i.productoId !== id))

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); buscar(e.target.value) }}
          placeholder="Buscar producto por nombre…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: 'var(--hc-surface-2)',
            border: '1px solid var(--hc-border)',
            color: 'var(--hc-text)',
          }}
        />
        {buscando && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        )}
        {resultados.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-10 overflow-hidden"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            {resultados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregar(p)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--hc-surface-2)]"
                style={{ borderBottom: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              >
                {p.imagenUrl && (
                  <img src={p.imagenUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.nombre}</div>
                  <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>₡{fmt(p.precioVenta)}</div>
                </div>
                <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de items agregados */}
      {items.length === 0 ? (
        <div className="text-center py-10 rounded-xl" style={{ border: '1px dashed var(--hc-border)', color: 'var(--hc-muted)' }}>
          <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
          </svg>
          <p className="text-sm">Buscá y agregá los productos comprados</p>
        </div>
      ) : (
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
                    onChange={(e) => update(item.productoId, 'cantidad', e.target.value)}
                    className="w-14 px-2 py-1 rounded-lg text-xs text-center outline-none"
                    style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>Precio ₡</span>
                  <input
                    type="number" min="0" value={item.precioUnitario}
                    onChange={(e) => update(item.productoId, 'precioUnitario', e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg text-xs text-center outline-none"
                    style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold" style={{ color: 'var(--hc-accent)' }}>
                  ₡{fmt(item.cantidad * item.precioUnitario)}
                </div>
                <button onClick={() => quitar(item.productoId)} className="text-xs mt-1 transition-opacity hover:opacity-70" style={{ color: '#f87171' }}>
                  Quitar
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-1">
            <div className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
              Total: ₡{fmt(items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────

const PASOS = ['Cliente', 'Productos', 'Confirmar']

export default function AdminAsignarProducto() {
  const navigate               = useNavigate()
  const { toast }              = useToast()
  const [paso, setPaso]        = useState(0)
  const [cliente, setCliente]  = useState(null)
  const [items, setItems]      = useState([])
  const [metodoPago, setMp]    = useState('EXTERNO')
  const [notas, setNotas]      = useState('')
  const [enviando, setEnviando] = useState(false)

  const seleccionarCliente = (u) => { setCliente(u); setPaso(1) }

  const confirmar = async () => {
    if (items.length === 0) { toast('Agregá al menos un producto', 'error'); return }
    setEnviando(true)
    try {
      await api.post('/admin/asignar/compra', {
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Registrar compra externa</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
          Asigná productos a un cliente para que pueda escribir reseñas y acceder a garantías.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {PASOS.map((label, i) => {
          const done = i < paso
          const active = i === paso
          let circleBg = 'var(--hc-surface-2)'
          let circleColor = 'var(--hc-muted)'
          let circleBorder = 'var(--hc-border)'
          if (done) { circleBg = 'rgba(16,185,129,0.15)'; circleColor = '#10b981'; circleBorder = 'rgba(16,185,129,0.3)' }
          else if (active) { circleBg = 'var(--hc-accent)'; circleColor = '#fff'; circleBorder = 'var(--hc-accent)' }
          return (
          <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
            <button
              onClick={() => { if (i < paso) setPaso(i) }}
              disabled={i > paso}
              className="flex items-center gap-2 disabled:cursor-not-allowed"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                style={{
                  backgroundColor: circleBg,
                  color: circleColor,
                  border: `1px solid ${circleBorder}`,
                }}>
                {done ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{ color: active ? 'var(--hc-text)' : 'var(--hc-muted)' }}>
                {label}
              </span>
            </button>
            {i < PASOS.length - 1 && (
              <div className="flex-1 h-px" style={{ backgroundColor: done ? 'rgba(16,185,129,0.3)' : 'var(--hc-border)' }} />
            )}
          </div>
          )
        })}
      </div>

      {/* Panel del paso activo */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <AnimatePresence mode="wait">
          {paso === 0 && (
            <motion.div key="p0" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--hc-text)' }}>Paso 1 — Seleccionar cliente</h2>
              <BuscarCliente onSelect={seleccionarCliente} />
            </motion.div>
          )}

          {paso === 1 && (
            <motion.div key="p1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold" style={{ color: 'var(--hc-text)' }}>Paso 2 — Agregar productos</h2>
                <ClienteBadge cliente={cliente} onCambiar={() => setPaso(0)} />
              </div>
              <AgregarProductos items={items} onChange={setItems} />
              <div className="flex justify-end mt-5">
                <button
                  onClick={() => { if (items.length > 0) setPaso(2); else toast('Agregá al menos un producto', 'error') }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
                >
                  Continuar →
                </button>
              </div>
            </motion.div>
          )}

          {paso === 2 && (
            <motion.div key="p2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold" style={{ color: 'var(--hc-text)' }}>Paso 3 — Confirmar</h2>
                <ClienteBadge cliente={cliente} onCambiar={() => setPaso(0)} />
              </div>

              {/* Resumen */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
                {items.map((item, i) => (
                  <div key={item.productoId} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < items.length - 1 ? '1px solid var(--hc-border)' : 'none' }}>
                    {item.imagenUrl && <img src={item.imagenUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />}
                    <div className="flex-1 text-sm" style={{ color: 'var(--hc-text)' }}>{item.nombre}</div>
                    <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>×{item.cantidad}</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--hc-accent)' }}>₡{fmt(item.cantidad * item.precioUnitario)}</div>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Total</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--hc-accent)' }}>
                    ₡{fmt(items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0))}
                  </span>
                </div>
              </div>

              {/* Método de pago */}
              <div className="space-y-1">
                <label htmlFor="asignar-metodo-pago" className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Método de pago</label>
                <select
                  id="asignar-metodo-pago"
                  value={metodoPago}
                  onChange={(e) => setMp(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                >
                  {['EXTERNO', 'SINPE', 'EFECTIVO', 'TRANSFERENCIA', 'CONTRA_ENTREGA'].map(m => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Notas */}
              <div className="space-y-1">
                <label htmlFor="asignar-notas" className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Notas internas (opcional)</label>
                <textarea
                  id="asignar-notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Ej: Comprado en feria, pago por Instagram…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                />
              </div>

              <div className="flex justify-between items-center pt-1">
                <button onClick={() => setPaso(1)} className="text-sm transition-opacity hover:opacity-70" style={{ color: 'var(--hc-muted)' }}>
                  ← Volver
                </button>
                <button
                  onClick={confirmar}
                  disabled={enviando}
                  className="px-6 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
                  style={{ backgroundColor: '#10b981', color: '#fff' }}
                >
                  {enviando ? 'Registrando…' : 'Registrar compra'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ClienteBadge({ cliente, onCambiar }) {
  if (!cliente) return null
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
        style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
        {cliente.nombre?.[0]?.toUpperCase()}
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--hc-accent)' }}>{cliente.nombre} {cliente.apellidoPaterno}</span>
      <button onClick={onCambiar} className="text-[10px] underline ml-1" style={{ color: 'var(--hc-muted)' }}>cambiar</button>
    </div>
  )
}
