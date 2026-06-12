import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useCartStore from '@/store/cartStore'
import useChatStore from '@/store/chatStore'
import { shoppingAssistantService } from '@/services/shoppingAssistantService'
import { getOrCreateVisitorId } from '@/utils/visitorId'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 4, height: 4, borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.55)',
          animation: 'hc-dot 1.1s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </span>
  )
}

function ProductCard({ producto, onAdd }) {
  const [added, setAdded] = useState(false)
  function handleAdd() {
    if (added) return
    onAdd(producto)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{
      background: 'var(--hc-surface)',
      border: '1px solid var(--hc-border)',
    }}>
      <Link to={`/productos/${producto.id}`} className="flex gap-3 p-3 hover:bg-white/3 transition-colors">
        {producto.imagenUrl
          ? <img src={producto.imagenUrl} alt={producto.nombre} className="w-14 h-14 rounded-lg object-cover shrink-0" />
          : <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-2xl opacity-30"
              style={{ background: 'var(--hc-surface-2)' }}>📦</div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold line-clamp-2 leading-snug" style={{ color: 'var(--hc-text)' }}>{producto.nombre}</p>
          {producto.sku && <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--hc-muted)' }}>SKU {producto.sku}</p>}
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--hc-accent)' }}>₡{fmt(producto.precio)}</p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button onClick={handleAdd}
          className="w-full py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{
            background: added ? 'rgba(34,197,94,0.12)' : 'var(--hc-accent)',
            color: added ? '#4ade80' : '#fff',
            border: added ? '1px solid rgba(34,197,94,0.3)' : 'none',
          }}>
          {added ? '✓ Añadido' : 'Añadir al carrito'}
        </button>
      </div>
    </div>
  )
}

/**
 * Agente del carrito — embebido en CartPage.
 * Sugiere productos complementarios basándose en el carrito actual
 * y en las búsquedas previas del usuario en el chat del homepage.
 */
export default function CartAssistant({ cartItems, cartTotal }) {
  const addItem        = useCartStore(s => s.addItem)
  const mensajesChat   = useChatStore(s => s.mensajes)
  const [abierto,  setAbierto]  = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [input,    setInput]    = useState('')
  const [cargando, setCargando] = useState(false)
  const [sesionId, setSesionId] = useState(() => shoppingAssistantService.loadSesionId('hotclick-cart'))
  const visitorId = useMemo(() => getOrCreateVisitorId(), [])
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const cargRef   = useRef(false)
  const initialized = useRef(false)

  function setLoading(v) { cargRef.current = v; setCargando(v) }

  // Contexto para el backend: CARRITO:items:total
  const itemsStr = cartItems.map(i => i.nombre).join(', ') || 'ninguno'
  const contexto = `CARRITO:${itemsStr}:${cartTotal}`

  // Extraer búsquedas previas del chat homepage
  const busquedasPrevias = mensajesChat
    .filter(m => m.rol === 'user')
    .slice(-3)
    .map(m => m.texto)
    .join(', ')

  useEffect(() => {
    if (abierto && !initialized.current) {
      initialized.current = true
      const greeting = busquedasPrevias
        ? `Vi que preguntaste por: "${busquedasPrevias}". Basándome en tu carrito, déjame sugerirte qué más podría interesarte...`
        : `Tenés ${cartItems.length} producto${cartItems.length !== 1 ? 's' : ''} en tu carrito. ¿Puedo sugerirte algo que complemente tu compra?`

      setMensajes([{ rol: 'assistant', texto: greeting }])

      // Auto-enviar consulta inicial si hay búsquedas previas
      if (busquedasPrevias && cartItems.length > 0) {
        const autoQuery = `Tengo en el carrito: ${itemsStr}. También pregunté por: ${busquedasPrevias}. ¿Qué más me recomendás?`
        setTimeout(() => enviarDirecto(autoQuery), 400)
      }
    }
    if (abierto) setTimeout(() => inputRef.current?.focus(), 120)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const addCartItem = useCallback((p) => {
    addItem({ id: p.id, nombre: p.nombre, sku: p.sku ?? '', precio: p.precio,
      precioVenta: p.precio, imagenPrincipalUrl: p.imagenUrl ?? null, stock: 99 }, 1)
  }, [addItem])

  async function enviarDirecto(msg) {
    if (!msg || cargRef.current) return
    setLoading(true)
    setMensajes(prev => [...prev, { rol: 'assistant', typing: true }])
    try {
      const result = await shoppingAssistantService.chat({
        empresaSlug: 'hotclick', mensaje: msg, sesionId, contexto, visitorId,
      })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId('hotclick-cart', result.sesionId)
      }
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant', texto: result.respuesta, productos: result.productos ?? [],
      }])
    } catch {
      setMensajes(prev => prev.slice(0, -1))
    } finally { setLoading(false) }
  }

  async function enviar(mensajeDirecto) {
    const msg = (mensajeDirecto ?? input).trim()
    if (!msg || cargRef.current) return
    setInput('')
    setLoading(true)
    setMensajes(prev => [...prev,
      { rol: 'user', texto: msg },
      { rol: 'assistant', typing: true },
    ])
    try {
      const result = await shoppingAssistantService.chat({
        empresaSlug: 'hotclick', mensaje: msg, sesionId, contexto, visitorId,
      })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId('hotclick-cart', result.sesionId)
      }
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant', texto: result.respuesta, productos: result.productos ?? [],
      }])
    } catch {
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant', texto: 'No pude conectar. Intentá de nuevo.',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  if (cartItems.length === 0) return null

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface)' }}>

      {/* Header / toggle */}
      <button
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/3"
      >
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{ background: 'color-mix(in srgb, var(--hc-accent) 15%, transparent)', color: 'var(--hc-accent)' }}>
            ✦
          </div>
          {busquedasPrevias && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2"
              style={{ borderColor: 'var(--hc-surface)' }} />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            ¿Necesitás algo más?
            {busquedasPrevias && (
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'color-mix(in srgb, #4ade80 12%, transparent)', color: '#4ade80' }}>
                Contexto disponible
              </span>
            )}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {abierto
              ? 'Preguntame qué más podría complementar tu compra.'
              : 'El asistente puede sugerirte productos que van bien con lo que tenés.'}
          </p>
        </div>
        <motion.svg
          animate={{ rotate: abierto ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="w-4 h-4 shrink-0" style={{ color: 'var(--hc-muted)' }}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Contenido */}
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid var(--hc-border)' }}>

              {/* Mensajes */}
              <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {mensajes.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.rol === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {m.rol === 'assistant' && (
                      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={{ background: 'var(--hc-accent)', color: '#fff' }}>✦</div>
                    )}
                    <div className="max-w-[88%] space-y-2">
                      {m.typing
                        ? <div className="px-3 py-2 rounded-2xl rounded-tl-sm text-sm"
                            style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                            <TypingDots />
                          </div>
                        : <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${m.rol === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                            style={m.rol === 'user'
                              ? { background: 'var(--hc-accent)', color: '#fff' }
                              : { background: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
                            {m.texto}
                          </div>
                      }
                      {!m.typing && m.productos?.length > 0 && (
                        <div className="space-y-2">
                          {m.productos.map((p, pi) => (
                            <ProductCard key={p.id ?? pi} producto={p} onAdd={addCartItem} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Sugerencias rápidas */}
              {mensajes.length <= 1 && !cargando && (
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {['¿Qué va bien con esto?', 'Algo más económico', 'Accesorios relacionados'].map(s => (
                    <button key={s} onClick={() => enviar(s)}
                      className="text-[11px] px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                      style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
                <div className="flex gap-2">
                  <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
                    placeholder={cargando ? 'Buscando...' : '¿Buscás algo más para completar tu compra?'}
                    disabled={cargando} maxLength={400}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
                    style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  />
                  <button onClick={() => enviar()} disabled={!input.trim() || cargando}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30"
                    style={{ background: 'var(--hc-accent)', color: '#fff' }} aria-label="Enviar">
                    {cargando ? <TypingDots /> : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
