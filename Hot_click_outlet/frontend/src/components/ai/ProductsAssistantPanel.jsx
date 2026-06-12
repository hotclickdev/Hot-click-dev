import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import { shoppingAssistantService } from '@/services/shoppingAssistantService'
import { getOrCreateVisitorId } from '@/utils/visitorId'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

const PANEL_CSS_ID = 'hc-panel-css'
const PANEL_CSS = `
  @keyframes hc-sa-dot { 0%,60%,100%{transform:translateY(0);opacity:.35} 30%{transform:translateY(-5px);opacity:1} }
`
if (typeof document !== 'undefined' && !document.getElementById(PANEL_CSS_ID)) {
  const s = document.createElement('style')
  s.id = PANEL_CSS_ID
  s.textContent = PANEL_CSS
  document.head.appendChild(s)
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.55)',
          animation: 'hc-sa-dot 1.1s ease-in-out infinite',
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
      backgroundColor: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <Link to={`/productos/${producto.id}`} className="flex gap-3 p-3 hover:opacity-80 transition-opacity">
        {producto.imagenUrl ? (
          <img src={producto.imagenUrl} alt={producto.nombre}
            className="w-14 h-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-2xl opacity-25"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>📦</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: '#F4F6F9' }}>
            {producto.nombre}
          </p>
          {producto.sku && (
            <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.32)' }}>
              SKU {producto.sku}
            </p>
          )}
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--hc-accent)' }}>
            ₡{fmt(producto.precio)}
          </p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button
          onClick={handleAdd}
          className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            backgroundColor: added ? 'rgba(34,197,94,0.18)' : 'var(--hc-accent)',
            color: added ? '#4ade80' : '#fff',
            border: added ? '1px solid rgba(34,197,94,0.35)' : '1px solid transparent',
          }}
        >
          {added ? '✓ Añadido' : 'Añadir al carrito'}
        </button>
      </div>
    </div>
  )
}

function Burbuja({ msg, onAdd }) {
  const isUser = msg.rol === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff', minWidth: 24 }}>
          ✦
        </div>
      )}
      <div className="max-w-[84%] space-y-2">
        {msg.typing ? (
          <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <TypingDots />
          </div>
        ) : (
          <div
            className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
            style={isUser
              ? { backgroundColor: 'var(--hc-accent)', color: '#fff' }
              : { backgroundColor: 'rgba(255,255,255,0.09)', color: '#e2e2e8' }}
          >
            {msg.texto}
          </div>
        )}
        {!msg.typing && msg.productos?.length > 0 && (
          <div className="space-y-2">
            {msg.productos.map((p, i) => (
              <ProductCard key={p.id ?? i} producto={p} onAdd={onAdd} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProductsAssistantPanel({ isOpen, onClose, initialQuery = '' }) {
  const addItem = useCartStore(s => s.addItem)
  const [mensajes, setMensajes] = useState([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [sesionId, setSesionId] = useState(() => shoppingAssistantService.loadSesionId('hotclick'))
  const visitorId = useMemo(() => getOrCreateVisitorId(), [])
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const cargRef = useRef(false)
  const sentInitial = useRef(false)

  function setLoading(v) { cargRef.current = v; setCargando(v) }

  useEffect(() => {
    if (!isOpen) return
    if (mensajes.length === 0 && !sentInitial.current) {
      const greeting = initialQuery
        ? `Vi que llegaste buscando "${initialQuery}". Déjame ver qué tenemos para vos... 🛍️`
        : '¡Hola! Soy el asistente de HotClick. ¿Qué estás buscando hoy?'

      setTimeout(() => {
        setMensajes([{ rol: 'assistant', texto: greeting }])
        if (initialQuery) {
          sentInitial.current = true
          setTimeout(() => enviarDirecto(initialQuery), 350)
        }
      }, 180)
    } else {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const addCartItem = useCallback((producto) => {
    addItem({
      id: producto.id,
      nombre: producto.nombre,
      sku: producto.sku ?? '',
      precio: producto.precio,
      precioVenta: producto.precio,
      imagenPrincipalUrl: producto.imagenUrl ?? null,
      stock: 99,
    }, 1)
  }, [addItem])

  async function enviarDirecto(msg) {
    if (!msg || cargRef.current) return
    setLoading(true)
    setMensajes(prev => [...prev, { rol: 'assistant', typing: true }])
    try {
      const result = await shoppingAssistantService.chat({ empresaSlug: 'hotclick', mensaje: msg, sesionId, visitorId })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId('hotclick', result.sesionId)
      }
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant',
        texto: result.respuesta,
        productos: result.productos ?? [],
      }])
    } catch (err) {
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant',
        texto: err?.response?.status === 429
          ? 'Demasiadas consultas. Esperá un momento.'
          : 'Hubo un problema al conectar. Verificá que el servidor esté activo.',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function enviar(mensajeDirecto) {
    const msg = (mensajeDirecto ?? input).trim()
    if (!msg || cargRef.current) return
    setInput('')
    setLoading(true)
    setMensajes(prev => [
      ...prev,
      { rol: 'user', texto: msg },
      { rol: 'assistant', typing: true },
    ])
    try {
      const result = await shoppingAssistantService.chat({ empresaSlug: 'hotclick', mensaje: msg, sesionId, visitorId })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId('hotclick', result.sesionId)
      }
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant',
        texto: result.respuesta,
        productos: result.productos ?? [],
      }])
    } catch (err) {
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant',
        texto: err?.response?.status === 429
          ? 'Demasiadas consultas. Esperá un momento.'
          : 'Hubo un problema al conectar. Intentá de nuevo.',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop en mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />

          {/* Panel lateral izquierdo */}
          <motion.aside
            initial={{ x: -380 }}
            animate={{ x: 0 }}
            exit={{ x: -380 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed left-0 top-0 h-full z-50 flex flex-col"
            style={{
              width: 'min(360px, 88vw)',
              backgroundColor: '#13131f',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '8px 0 40px rgba(0,0,0,0.45)',
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3.5 flex items-center gap-3 shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--hc-accent) 0%, color-mix(in srgb, var(--hc-accent) 70%, #152B5E) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                ✦
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-none">Asistente HotClick</p>
                <p className="text-[11px] text-white/55 mt-0.5 truncate">
                  {cargando ? 'Buscando productos...' : 'Te ayudo a encontrar lo que necesitás'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
                aria-label="Cerrar asistente"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Badge de contexto */}
            {initialQuery && (
              <div
                className="px-4 py-2 shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.03)' }}
              >
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Buscaste: <span style={{ color: 'var(--hc-accent)' }}>"{initialQuery}"</span>
                </p>
              </div>
            )}

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {mensajes.map((m, i) => (
                <Burbuja key={i} msg={m} onAdd={addCartItem} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Sugerencias rápidas — solo cuando no hay query inicial */}
            {mensajes.length <= 1 && !cargando && !initialQuery && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {['¿Qué tenés?', 'Lo más popular', 'Ofertas', 'Busco un regalo'].map(s => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full hover:opacity-70 transition-opacity"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: '#A7B0BC',
                      border: '1px solid rgba(255,255,255,0.13)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div
              className="px-3 pb-4 pt-2.5 shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={cargando ? 'Buscando...' : '¿Qué más necesitás?'}
                  disabled={cargando}
                  maxLength={500}
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: '#F4F6F9',
                    border: '1px solid rgba(255,255,255,0.14)',
                  }}
                />
                <button
                  onClick={() => enviar()}
                  disabled={!input.trim() || cargando}
                  className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-30"
                  style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
                  aria-label="Enviar"
                >
                  {cargando ? <TypingDots /> : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
