/**
 * AIChat — primitivo compartido de conversación HotClick AI.
 *
 * Usado por AIProductSection, AICartSection, AIPostPaySection y AIHeroSearch.
 * Llama a /api/public/chat vía SSE (Claude-only, sin Voyage AI).
 *
 * Props:
 *   empresaSlug      (string)   slug de la empresa en el backend (default: 'hotclick')
 *   context          (string)   contexto backend: GENERAL | PRODUCTO:... | CARRITO:... | etc.
 *   sessionKey       (string)   clave para persistir historial en localStorage
 *   chips            (string[]) sugerencias rápidas visibles antes del primer mensaje
 *   placeholder      (string)   texto del input
 *   autoQuery        (string)   consulta enviada automáticamente al montar
 *   accentColor      (string)   color de acento override (default: var(--hc-accent))
 *   maxHistoryHeight (number)   alto máximo del historial antes de hacer scroll
 *   inputRef         (ref)      ref externo opcional para hacer focus desde el padre
 *   onProductAdd     (fn)       callback adicional al añadir producto al carrito
 *   whatsappNumber   (string)   número WhatsApp de la tienda (default: '50686667888')
 *   showHumanButton  (boolean)  muestra botón "Hablar con humano" (default: true)
 *   proactiveTrigger (boolean)  activa timer de mensaje proactivo a los 3 min (default: false)
 *   exitIntentEnabled(boolean)  activa pop-up al intentar salir (default: false)
 */
import { useState, useRef, useCallback, useEffect, Fragment } from 'react'
import useCartStore from '@/store/cartStore'
import useChatStore from '@/store/chatStore'
import useAuthStore from '@/store/authStore'
import AIProductCard from './AIProductCard'
import AICategoryChip from './AICategoryChip'
import { TypingDots, AIAvatar } from './AITypingBubble'

// ── Helpers ───────────────────────────────────────────────────────────────────

function MarkdownSpan({ text }) {
  const segments = text.split(/(\*\*[^*\n]+\*\*)/g)
  return (
    <Fragment>
      {segments.flatMap((seg, i) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return [<strong key={i} style={{ fontWeight: 700 }}>{seg.slice(2, -2)}</strong>]
        }
        return seg.split('\n').flatMap((line, j, arr) =>
          j < arr.length - 1 ? [line, <br key={`${i}-${j}`} />] : [line]
        )
      })}
    </Fragment>
  )
}

const MSG_CSS_ID = 'hc-ai-msg-css'
if (typeof document !== 'undefined' && !document.getElementById(MSG_CSS_ID)) {
  const s = document.createElement('style')
  s.id = MSG_CSS_ID
  s.textContent = `@keyframes ai-msg-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`
  document.head.appendChild(s)
}

const removeMsg = (msg) => (list) => list.filter(x => x !== msg)

function normalizeProduct(p) {
  return {
    id:             p.id_producto    ?? p.id,
    nombre:         p.nombre_producto ?? p.nombre,
    descripcionCorta: p.descripcion_corta ?? p.descripcionCorta,
    precio:         p.precio_venta   ?? p.precio,
    precioOferta:   p.precio_oferta  ?? p.precioOferta ?? null,
    imagenUrl:      p.imagen_principal_url ?? p.imagenUrl,
    sku:            p.sku            ?? '',
    stock:          p.stock_actual   ?? p.stock ?? 99,
    similarity:     p.similarity,
  }
}

/** Detects if current time is outside Costa Rica business hours (8am–8pm). */
function isAfterHours() {
  const crHour = new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica', hour: 'numeric', hour12: false })
  const h = parseInt(crHour, 10)
  return h < 8 || h >= 20
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIChat({
  empresaSlug = 'hotclick',
  context = 'GENERAL',
  sessionKey = 'hotclick',
  chips = [],
  placeholder = '¿En qué te puedo ayudar?',
  autoQuery = null,
  accentColor = null,
  maxHistoryHeight = 320,
  inputRef: externalInputRef = null,
  onProductAdd = null,
  whatsappNumber = '50686667888',
  showHumanButton = true,
  proactiveTrigger = false,
  exitIntentEnabled = false,
  fullHeight = false,
}) {
  const addItem    = useCartStore(s => s.addItem)
  const userName   = useAuthStore(s => s.userName)
  const storageKey = `hc-chat-msgs-${sessionKey}`
  const searchKey  = `hc-chat-searches-${sessionKey}`

  const [mensajes, setMensajes] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(m => !m.typing && !m.failed) : []
    } catch { return [] }
  })

  const [sessionSearches, setSessionSearches] = useState(() => {
    try {
      const raw = sessionStorage.getItem(searchKey)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const [input,        setInput]        = useState('')
  const [cargando,     setCargando]     = useState(false)
  const [copiedIdx,    setCopiedIdx]    = useState(null)
  const [proactiveSent, setProactiveSent] = useState(false)
  const [exitShown,    setExitShown]    = useState(false)
  const [afterHours]                    = useState(isAfterHours)

  const historyRef      = useRef(null)
  const internalInputRef = useRef(null)
  const inputRef        = externalInputRef || internalInputRef
  const cargRef         = useRef(false)
  const autoSent        = useRef(false)

  const accent = accentColor || 'var(--hc-accent)'

  function setLoading(v) { cargRef.current = v; setCargando(v) }

  // ── Persistence ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [mensajes])

  useEffect(() => {
    const toSave = mensajes.filter(m => !m.typing && !m.failed).slice(-30)
    try { localStorage.setItem(storageKey, JSON.stringify(toSave)) } catch { /* quota */ }
  }, [mensajes, storageKey])

  useEffect(() => {
    if (sessionKey !== 'hotclick') return
    useChatStore.getState().setMensajes(mensajes)
  }, [mensajes, sessionKey])

  useEffect(() => {
    try { sessionStorage.setItem(searchKey, JSON.stringify(sessionSearches.slice(-6))) } catch { /* quota */ }
  }, [sessionSearches, searchKey])

  // ── Auto query ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!autoQuery || autoSent.current) return
    autoSent.current = true
    const timer = setTimeout(() => enviarDirecto(autoQuery), 700)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Proactive trigger (3 minutes idle) ──────────────────────────────────────

  useEffect(() => {
    if (!proactiveTrigger || proactiveSent || mensajes.length > 0) return
    const timer = setTimeout(() => {
      if (cargRef.current || proactiveSent) return
      setProactiveSent(true)
      const msg = userName
        ? `Hola ${userName.split(' ')[0]}, ¿encontraste lo que buscás? Puedo ayudarte.`
        : '¿Podés ayudarte a encontrar algo? Tenemos ofertas disponibles hoy.'
      setMensajes(prev => [...prev, { rol: 'assistant', texto: msg, productos: [], opts: [
        '¿Qué hay en oferta?', '¿Cuánto cuesta el envío?', 'Ver productos populares',
      ]}])
    }, 3 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [proactiveTrigger, proactiveSent, mensajes.length, userName])

  // ── Exit intent ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!exitIntentEnabled || exitShown) return
    function handleMouseLeave(e) {
      if (e.clientY > 10) return
      setExitShown(true)
      if (mensajes.length > 0 || cargRef.current) return
      setMensajes(prev => [...prev, { rol: 'assistant', texto:
        '¡Espera! ¿Encontraste lo que buscabas? Puedo ayudarte a encontrar exactamente lo que necesitás antes de irte.',
        productos: [], opts: ['¿Tenés algo en oferta?', '¿Cuánto cuesta el envío?', 'Buscar un producto'],
      }])
    }
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [exitIntentEnabled, exitShown, mensajes.length])

  // ── Add to cart ──────────────────────────────────────────────────────────────

  const handleAdd = useCallback((producto) => {
    addItem({
      id: producto.id, nombre: producto.nombre, sku: producto.sku ?? '',
      precio: producto.precio, precioVenta: producto.precio,
      imagenPrincipalUrl: producto.imagenUrl ?? null, stock: producto.stock ?? 99,
    }, 1)
    onProductAdd?.(producto)
  }, [addItem, onProductAdd])

  // ── Copy response ────────────────────────────────────────────────────────────

  function copyMessage(texto, idx) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    }).catch(() => {})
  }

  // ── Core send logic ──────────────────────────────────────────────────────────

  async function enviarDirecto(msg) {
    if (!msg?.trim() || cargRef.current) return
    setLoading(true)
    setMensajes(prev => [...prev, { rol: 'assistant', typing: true, texto: '', productos: [] }])
    await streamChat(msg.trim(), [], [])
    setLoading(false)
  }

  /** IDs de los productos del último mensaje que mostró alguno — permite que un follow-up
   *  (FAQ de stock/envío/pago) reutilice el mismo producto en vez de disparar una búsqueda nueva. */
  function lastShownProductIds() {
    const last = [...mensajes].reverse().find(m => m.productos?.length > 0)
    return last ? last.productos.map(p => p.id).filter(Boolean) : []
  }

  async function streamChat(msg, history, focusIds = []) {
    let assembled = ''
    let productos = []
    try {
      const response = await fetch(`/api/public/chat?slug=${encodeURIComponent(empresaSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, offset: 0, history, context, focusIds }),
      })
      if (!response.ok) throw new Error(response.status === 429 ? '429' : 'err')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let eventName = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trim()
            if (!data) continue
            try {
              const parsed = JSON.parse(data)
              if (eventName === 'products') {
                productos = (parsed.productos ?? []).map(normalizeProduct)
                setMensajes(prev => {
                  const last = prev[prev.length - 1]
                  if (!last?.typing) return prev
                  return [...prev.slice(0, -1), { ...last, productos }]
                })
              } else if (eventName === 'delta' && parsed.text) {
                assembled += parsed.text
                setMensajes(prev => {
                  const last = prev[prev.length - 1]
                  if (!last?.typing) return prev
                  return [...prev.slice(0, -1), { ...last, texto: assembled, productos }]
                })
              } else if (eventName === 'done') {
                const backendOpts = parsed.opts ?? []
                setMensajes(prev => {
                  const last = prev[prev.length - 1]
                  if (!last) return prev
                  return [...prev.slice(0, -1), {
                    rol: 'assistant', texto: assembled, productos, categorias: [],
                    opts: backendOpts,
                  }]
                })
              } else if (eventName === 'error') {
                setMensajes(prev => [...prev.slice(0, -1), {
                  rol: 'assistant', failed: true, texto: parsed.error || 'Error al buscar productos',
                }])
              }
            } catch { /* non-critical */ }
          }
        }
      }
    } catch (err) {
      const errorText = err?.message === '429'
        ? 'Muchas consultas seguidas. Esperá un momento.'
        : 'No pude conectar. Verificá tu conexión.'
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant', failed: true, failedQuery: msg, texto: errorText,
      }])
    }
  }

  async function enviar(mensajeDirecto) {
    const msg = (mensajeDirecto ?? input).trim()
    if (!msg || cargRef.current) return
    setInput('')
    setLoading(true)

    // Track session searches (max 6)
    setSessionSearches(prev => {
      const next = [msg, ...prev.filter(s => s !== msg)].slice(0, 6)
      return next
    })

    const history = mensajes
      .filter(m => !m.typing && !m.failed && m.texto)
      .slice(-10)
      .map(m => ({ rol: m.rol, texto: m.texto }))
    const focusIds = lastShownProductIds()
    setMensajes(prev => [...prev,
      { rol: 'user', texto: msg },
      { rol: 'assistant', typing: true, texto: '', productos: [] },
    ])
    await streamChat(msg, history, focusIds)
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const userMsgCount    = mensajes.filter(m => m.rol === 'user').length
  const lastAssistant   = [...mensajes].reverse().find(m => m.rol === 'assistant' && !m.typing)
  const lastUserMsg     = [...mensajes].reverse().find(m => m.rol === 'user')
  const contextChips    = lastAssistant?.opts?.length > 0 ? lastAssistant.opts
                        : lastAssistant?.categorias?.length > 0 ? lastAssistant.categorias
                        : null
  const activeChips     = userMsgCount === 0 ? chips : (contextChips ?? [])
  const showChips       = activeChips.length > 0 && !cargando

  const productoNombreCtx = context.startsWith('PRODUCTO:')
    ? context.split(':')[1] ?? null : null

  const showAlternativas =
    !cargando && userMsgCount > 0 && lastAssistant != null &&
    (lastAssistant.productos?.length ?? 0) === 0 && lastUserMsg != null

  const queryAlternativas = productoNombreCtx
    ? `¿Qué productos similares o alternativos a "${productoNombreCtx}" tenés disponibles?`
    : `¿Qué productos similares o relacionados con "${lastUserMsg?.texto ?? ''}" tenés disponibles?`

  const isCarritoContext = context.startsWith('CARRITO')
  const hasProductsInLastMsg = (lastAssistant?.productos?.length ?? 0) > 0

  // Greeting with optional user name
  const greetingText = userName
    ? `¡Hola, ${userName.split(' ')[0]}! ¿En qué te puedo ayudar hoy?`
    : null

  // ── Shared fragments ────────────────────────────────────────────────────────

  const afterHoursBanner = afterHours && mensajes.length === 0 && (
    <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
      style={{ background: 'rgba(245,158,11,0.08)', color: '#B45309', border: '1px solid rgba(245,158,11,0.2)' }}>
      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
      </svg>
      <span>Atención al cliente disponible 8am–8pm. Tu pedido se procesa igual y respondemos al WhatsApp al día siguiente.</span>
    </div>
  )

  const greetingEl = greetingText && mensajes.length === 0 && (
    <p className="text-xs px-1" style={{ color: 'var(--hc-text-muted, #6B7280)' }}>
      {greetingText}
    </p>
  )

  const messageList = mensajes.map((m, i) => (
    <div
      key={i}
      className={`flex gap-2.5 ${m.rol === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ animation: 'ai-msg-in 0.25s ease both' }}
    >
      {m.rol === 'assistant' && <AIAvatar />}
      <div className="max-w-[85%] space-y-2">
        {m.typing && !m.texto
          ? <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <TypingDots />
            </div>
          : (
            <div className="group relative">
              <div
                className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.rol === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                style={m.rol === 'user'
                  ? { background: accent, color: '#ffffff', fontWeight: 500 }
                  : {
                      background: m.failed ? '#FEF2F2' : '#F9FAFB',
                      color: '#111827',
                      border: `1px solid ${m.failed ? '#FECACA' : '#E5E7EB'}`,
                    }}
              >
                {m.rol === 'user'
                  ? <span style={{ whiteSpace: 'pre-wrap' }}>{m.texto}</span>
                  : <span style={{ whiteSpace: 'pre-wrap' }}>
                      <MarkdownSpan text={m.texto ?? ''} />
                      {m.typing && <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse rounded-sm bg-current opacity-70" />}
                    </span>
                }
                {m.failed && (
                  <button
                    onClick={() => { setMensajes(removeMsg(m)); enviar(m.failedQuery) }}
                    className="flex items-center gap-1 mt-2 text-[11px] font-medium transition-opacity hover:opacity-80"
                    style={{ color: '#E73B33' }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reintentar
                  </button>
                )}
              </div>

              {m.rol === 'assistant' && !m.typing && !m.failed && m.texto && (
                <button
                  onClick={() => copyMessage(m.texto, i)}
                  className="absolute -bottom-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg"
                  style={{ background: '#F3F4F6', color: '#6B7280' }}
                  title={copiedIdx === i ? 'Copiado' : 'Copiar respuesta'}
                >
                  {copiedIdx === i
                    ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                  }
                </button>
              )}
            </div>
          )
        }

        {m.productos?.length > 0 && (
          <div className="space-y-2">
            {m.productos.map((p, pi) => (
              <AIProductCard key={p.id ?? pi} producto={p} similarity={p.similarity}
                onAdd={handleAdd} whatsappNumber={whatsappNumber} />
            ))}
          </div>
        )}

        {!m.typing && m.categorias?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {m.categorias.map(cat => (
              <AICategoryChip key={cat} nombre={cat} accentColor={accent} />
            ))}
          </div>
        )}

        {!m.typing && m.opts?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {m.opts.map(opt => (
              <button
                key={opt}
                onClick={() => enviar(opt)}
                className="text-[11px] px-3 py-1.5 rounded-full font-medium transition-all hover:opacity-80 active:scale-95"
                style={{
                  background: `color-mix(in srgb, ${accent} 10%, transparent)`,
                  color: accent,
                  border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {!m.typing && m.rol === 'assistant' && isCarritoContext && hasProductsInLastMsg && i === mensajes.length - 1 && (
          <a
            href="/checkout"
            className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold transition-all hover:opacity-80 active:scale-95"
            style={{ background: accent, color: '#fff' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
            </svg>
            Ir al checkout
          </a>
        )}
      </div>
    </div>
  ))

  const sessionSearchChips = sessionSearches.length > 0 && mensajes.length === 0 && (
    <div className="space-y-1">
      <p className="text-[10px] font-medium px-1" style={{ color: '#9CA3AF' }}>Búsquedas recientes</p>
      <div className="flex flex-wrap gap-1.5">
        {sessionSearches.slice(0, 4).map(s => (
          <button
            key={s}
            onClick={() => enviar(s)}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full transition-all hover:opacity-80 active:scale-95"
            style={{ background: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {s.length > 30 ? s.slice(0, 30) + '…' : s}
          </button>
        ))}
      </div>
    </div>
  )

  const initialChipsEl = showChips && userMsgCount === 0 && (
    <div className="flex flex-wrap gap-1.5">
      {activeChips.map(chip => (
        <button
          key={chip}
          onClick={() => enviar(chip)}
          className="text-[11px] px-3 py-1.5 rounded-full transition-all hover:opacity-80 active:scale-95"
          style={{
            background: `color-mix(in srgb, ${accent} 8%, transparent)`,
            color: accent,
            border: `1px solid color-mix(in srgb, ${accent} 20%, transparent)`,
          }}
        >
          {chip}
        </button>
      ))}
    </div>
  )

  const contextChipsEl = showChips && userMsgCount > 0 && (
    <div className="flex flex-wrap gap-1.5">
      {activeChips.map(chip => (
        <button
          key={chip}
          onClick={() => enviar(chip)}
          className="text-[11px] px-3 py-1.5 rounded-full transition-all hover:opacity-80 active:scale-95"
          style={{
            background: `color-mix(in srgb, ${accent} 8%, transparent)`,
            color: accent,
            border: `1px solid color-mix(in srgb, ${accent} 20%, transparent)`,
          }}
        >
          {chip}
        </button>
      ))}
    </div>
  )

  const alternativasEl = showAlternativas && (
    <button
      onClick={() => enviar(queryAlternativas)}
      className="self-start text-[11px] px-3 py-1.5 rounded-full transition-all hover:opacity-80 active:scale-95 flex items-center gap-1.5"
      style={{
        background: `color-mix(in srgb, ${accent} 8%, transparent)`,
        color: accent,
        border: `1px solid color-mix(in srgb, ${accent} 20%, transparent)`,
      }}
    >
      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
      </svg>
      Ver productos similares
    </button>
  )

  const inputBar = (
    <div
      className="flex items-center gap-0 rounded-full overflow-hidden transition-all"
      style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB' }}
    >
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={cargando ? 'Buscando...' : placeholder}
        disabled={cargando}
        maxLength={500}
        className="flex-1 px-4 py-3 text-sm outline-none bg-transparent disabled:opacity-50"
        style={{ color: '#111827', caretColor: accent }}
        onFocus={e => { e.currentTarget.closest('div').style.borderColor = accent }}
        onBlur={e => { e.currentTarget.closest('div').style.borderColor = '#E5E7EB' }}
      />
      {showHumanButton && (
        <a
          href={`https://wa.me/${whatsappNumber}?text=Hola,%20necesito%20ayuda%20con%20un%20producto`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 ml-1 rounded-full shrink-0 flex items-center justify-center transition-all hover:opacity-80"
          style={{ background: '#25D366', color: '#fff' }}
          title="Hablar con humano por WhatsApp"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.089.54 4.05 1.485 5.757L.057 23.882l6.233-1.43A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.804a9.777 9.777 0 01-4.986-1.367l-.358-.212-3.714.852.882-3.613-.23-.371A9.782 9.782 0 012.196 12C2.196 6.58 6.58 2.196 12 2.196S21.804 6.58 21.804 12 17.42 21.804 12 21.804z"/>
          </svg>
        </a>
      )}
      <button
        onClick={() => enviar()}
        disabled={!input.trim() || cargando}
        aria-label="Enviar"
        className="w-10 h-10 mr-1 ml-0.5 rounded-full shrink-0 flex items-center justify-center transition-all hover:opacity-80 active:scale-95 disabled:opacity-30"
        style={{ background: accent, color: '#fff' }}
      >
        {cargando
          ? <TypingDots color="rgba(255,255,255,0.8)" />
          : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
        }
      </button>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  if (fullHeight) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--hc-surface)' }}>
        {/* Scrollable messages area */}
        <div
          ref={historyRef}
          className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3 px-4 pt-4 pb-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--hc-border) transparent' }}
        >
          {afterHoursBanner}
          {greetingEl}
          {messageList}
          {sessionSearchChips}
          {/* Push initial chips toward bottom when no messages */}
          {mensajes.length === 0 && <div className="flex-1" />}
          {initialChipsEl}
        </div>

        {/* Fixed bottom area: context chips + input */}
        <div
          className="shrink-0 px-4 pt-2 pb-4 flex flex-col gap-2"
          style={{ borderTop: '1px solid var(--hc-border)' }}
        >
          {contextChipsEl}
          {alternativasEl}
          {inputBar}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {afterHoursBanner}
      {greetingEl}

      {mensajes.length > 0 && (
        <div
          ref={historyRef}
          className="space-y-4 overflow-y-auto"
          style={{
            maxHeight: maxHistoryHeight,
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--hc-border) transparent',
          }}
        >
          {messageList}
        </div>
      )}

      {sessionSearchChips}
      {initialChipsEl}
      {contextChipsEl}
      {alternativasEl}
      {inputBar}
    </div>
  )
}
