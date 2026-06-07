import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useBranding } from '@/hooks/useBranding'
import useChatStore from '@/store/chatStore'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

// Keyframes inyectados una sola vez en el DOM
const CHAT_CSS = `
  @keyframes hc-msg-bot   { from { opacity:0; transform:translateX(-10px) translateY(4px) } to { opacity:1; transform:none } }
  @keyframes hc-msg-user  { from { opacity:0; transform:translateX(10px)  translateY(4px) } to { opacity:1; transform:none } }
  @keyframes hc-fade-up   { from { opacity:0; transform:translateY(7px)  } to { opacity:1; transform:none } }
  @keyframes hc-panel-in  { from { opacity:0; transform:translateY(14px) scale(0.97) } to { opacity:1; transform:none } }
  @keyframes hc-dot       { 0%,60%,100% { transform:translateY(0);   opacity:0.3 }
                             30%         { transform:translateY(-5px); opacity:1   } }
`
if (typeof document !== 'undefined' && !document.getElementById('hc-chat-css')) {
  const s = document.createElement('style')
  s.id = 'hc-chat-css'
  s.textContent = CHAT_CSS
  document.head.appendChild(s)
}

// ── Dots de escritura ─────────────────────────────────────────────────────────
function TypingDots({ color = 'currentColor' }) {
  return (
    <span className="inline-flex items-center gap-[3px] px-0.5 align-middle">
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block',
          width: 5, height: 5,
          borderRadius: '50%',
          backgroundColor: color,
          animation: 'hc-dot 1.1s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </span>
  )
}

// ── Mini product card inside the chat ────────────────────────────────────────
function ProductoCard({ p, delay = 0 }) {
  return (
    <Link to={`/productos/${p.id_producto}`}
      className="flex items-center gap-2.5 rounded-xl p-2 hover:opacity-90 transition-opacity"
      style={{
        backgroundColor: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        animation: 'hc-fade-up 0.28s ease both',
        animationDelay: `${delay}ms`,
      }}>
      {p.imagen_principal_url ? (
        <img src={p.imagen_principal_url} alt={p.nombre_producto}
          className="w-10 h-10 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-tight truncate" style={{ color: '#e8e8ed' }}>
          {p.nombre_producto}
        </p>
        <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--hc-accent, #ff4b12)' }}>
          ₡{fmt(p.precio_venta)}
        </p>
      </div>
      <svg className="w-3 h-3 shrink-0 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Burbuja({ msg }) {
  const isUser = msg.rol === 'user'
  const waiting = !isUser && msg.streaming && !msg.texto

  return (
    <div
      className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ animation: `${isUser ? 'hc-msg-user' : 'hc-msg-bot'} 0.28s ease both` }}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-sm"
          style={{ backgroundColor: 'var(--hc-accent, #ff4b12)' }}>
          🛍️
        </div>
      )}
      <div className="max-w-[85%] space-y-2">

        {/* Bubble — siempre visible para el bot mientras streaming, aunque texto esté vacío */}
        {(msg.texto || waiting) && (
          <div
            className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
            style={isUser
              ? { backgroundColor: 'var(--hc-accent, #ff4b12)', color: '#fff' }
              : { backgroundColor: 'rgba(255,255,255,0.1)', color: '#e8e8ed' }}
          >
            {waiting
              ? <TypingDots color="rgba(255,255,255,0.65)" />
              : <>
                  {msg.texto}
                  {msg.streaming && (
                    <span
                      className="inline-block w-[2px] h-[11px] ml-0.5 rounded-sm"
                      style={{ backgroundColor: 'currentColor', opacity: 0.7,
                        animation: 'hc-dot 0.8s ease-in-out infinite' }} />
                  )}
                </>
            }
          </div>
        )}

        {/* Productos con entrada escalonada */}
        {msg.productos?.length > 0 && (
          <div className="space-y-1.5">
            {msg.productos.map((p, i) => (
              <ProductoCard key={i} p={p} delay={i * 75} />
            ))}
          </div>
        )}

        {/* Botones de acción con fade-up */}
        {msg.acciones && (
          <div
            className="flex flex-wrap gap-1.5 mt-1"
            style={{ animation: 'hc-fade-up 0.3s ease both', animationDelay: '60ms' }}
          >
            {msg.acciones.map((a, i) => (
              <button key={i} onClick={a.onClick}
                className="text-[10px] px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#e8e8ed',
                  border: '1px solid rgba(255,255,255,0.15)',
                  animation: 'hc-fade-up 0.25s ease both',
                  animationDelay: `${60 + i * 50}ms` }}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function ChatWidget({ slug }) {
  const branding = useBranding(slug)

  // Cuando chatActivo es false el botón flotante se oculta, pero el componente
  // sigue montado para responder al HomeChatBar vía chatStore.
  const showToggle = branding === null || branding?.chatActivo !== false

  return <ChatWidgetInner slug={slug} showToggle={showToggle} />
}

function ChatWidgetInner({ slug, showToggle = true }) {
  const [abierto, setAbierto]   = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [input, setInput]       = useState('')
  const [cargando, setCargando] = useState(false)
  const [offset, setOffset]     = useState(0)
  const [lastQuery, setLastQuery] = useState('')
  const [dot, setDot]           = useState(false)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const pendingRef = useRef(null)

  const storeOpen     = useChatStore((s) => s.isOpen)
  const storePending  = useChatStore((s) => s.pendingMessage)
  const storeClear    = useChatStore((s) => s.clearPending)
  const storeClose    = useChatStore((s) => s.close)

  // Sync store → local open state + capture pending message
  useEffect(() => {
    if (!storeOpen) return
    if (storePending) {
      pendingRef.current = storePending
      storeClear()
    }
    setAbierto(true)
    storeClose()
  }, [storeOpen, storePending, storeClear, storeClose])

  // Send pending message whenever abierto becomes true OR a new pending arrives while already open
  useEffect(() => {
    if (!abierto) return
    if (!pendingRef.current) {
      // Show greeting only on first open with no messages
      if (mensajes.length === 0) {
        const t = setTimeout(() => {
          setMensajes([{
            rol: 'bot',
            texto: '¡Hola! 👋 ¿Qué estás buscando hoy? Decime para qué ambiente o qué necesitás y te ayudo a encontrar opciones. Por ejemplo: sala, cocina, jardín...',
          }])
        }, 300)
        return () => clearTimeout(t)
      }
      return
    }
    const msg = pendingRef.current
    pendingRef.current = null
    setMensajes(prev => [...prev, { rol: 'user', texto: msg }])
    const t = setTimeout(() => enviar(msg), 80)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, storeOpen])

  // Dot notification after 10s on page
  useEffect(() => {
    const t = setTimeout(() => setDot(true), 10000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function enviar(mensajeTexto, currentOffset = 0) {
    const msg = (mensajeTexto ?? input).trim()
    if (!msg || cargando) return

    setInput('')
    setCargando(true)
    setDot(false)

    if (!mensajeTexto) {
      setMensajes(prev => [...prev, { rol: 'user', texto: msg }])
    }

    const token = (() => {
      try { return JSON.parse(localStorage.getItem('hotclick-auth') ?? '{}')?.state?.token ?? '' }
      catch { return '' }
    })()

    setMensajes(prev => [...prev, { rol: 'bot', texto: '', streaming: true, productos: [] }])

    try {
      const url = slug ? `/api/public/chat?slug=${slug}` : '/api/public/chat'
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: msg, offset: currentOffset }),
      })

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', accText = '', productos = [], hasMore = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event:')) continue
          // Spring Boot sends "data:{...}" (no space); browsers send "data: {...}"
          if (!line.startsWith('data:')) continue
          try {
            const raw = line.startsWith('data: ') ? line.slice(6) : line.slice(5)
            const data = JSON.parse(raw)
            if (data.productos !== undefined) {
              productos = data.productos
              hasMore   = data.hasMore
              setMensajes(prev => {
                const next = [...prev]
                next[next.length - 1] = { ...next[next.length - 1], productos }
                return next
              })
            }
            if (data.text) {
              accText += data.text
              setMensajes(prev => {
                const next = [...prev]
                next[next.length - 1] = { ...next[next.length - 1], texto: accText, streaming: true }
                return next
              })
            }
          } catch {}
        }
      }

      // Build action buttons
      const acciones = []
      if (hasMore) {
        const nextOffset = currentOffset + 5
        acciones.push({
          label: 'Ver 5 más ▸',
          onClick: () => {
            setOffset(nextOffset)
            setLastQuery(msg)
            enviar(msg, nextOffset)
          },
        })
      }
      acciones.push({ label: 'Buscar otra cosa 🔄', onClick: resetear })

      setMensajes(prev => {
        const next = [...prev]
        next[next.length - 1] = { ...next[next.length - 1], streaming: false, acciones }
        return next
      })

    } catch (e) {
      setMensajes(prev => {
        const next = [...prev]
        next[next.length - 1] = { rol: 'bot', texto: 'Hubo un error. ¿Podés intentarlo de nuevo?' }
        return next
      })
    } finally {
      setCargando(false)
      inputRef.current?.focus()
    }
  }

  function resetear() {
    setMensajes([{
      rol: 'bot',
      texto: '¡Claro! ¿Qué otro tipo de producto buscás?',
    }])
    setOffset(0)
    setLastQuery('')
    inputRef.current?.focus()
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  const accent = 'var(--hc-accent, #ff4b12)'

  return (
    <>
      {/* Toggle button — oculto cuando showToggle=false (admin desactivó el FAB) */}
      <button
        onClick={() => { setAbierto(v => !v); setDot(false) }}
        className="fixed bottom-[4.75rem] right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full shadow-2xl
                   flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: accent, color: '#fff', display: showToggle ? 'flex' : 'none' }}
        aria-label="Chat de ayuda"
      >
        {abierto ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {dot && (
              <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white border-2 animate-pulse"
                style={{ borderColor: accent }} />
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      {abierto && (
        <div className="fixed bottom-[9rem] left-3 right-3 sm:bottom-24 sm:left-auto sm:right-6 sm:w-96 z-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: '70vh', backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)',
            animation: 'hc-panel-in 0.32s cubic-bezier(0.16,1,0.3,1) both' }}>

          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-2.5 shrink-0"
            style={{ backgroundColor: accent }}>
            <span className="text-xl">🛍️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-none">Asistente de compras</p>
              <p className="text-[10px] text-white/70 mt-0.5">Te ayudo a encontrar lo que buscás</p>
            </div>
            <button onClick={() => setAbierto(false)} aria-label="Cerrar chat"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {mensajes.map((m, i) => <Burbuja key={i} msg={m} />)}
            <div ref={bottomRef} />
          </div>

          {/* Sugerencias rápidas (solo al inicio) */}
          {mensajes.length <= 1 && !cargando && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {['Sala','Cocina','Dormitorio','Jardín','Decoración'].map(s => (
                <button key={s} onClick={() => enviar(s)}
                  className="text-[10px] px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#e8e8ed',
                    border: '1px solid rgba(255,255,255,0.12)' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="¿Qué buscás?"
                disabled={cargando}
                className="flex-1 px-3 py-2 rounded-xl text-xs outline-none disabled:opacity-50"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#e8e8ed',
                  border: '1px solid rgba(255,255,255,0.12)' }}
              />
              <button onClick={() => enviar()} disabled={cargando || !input.trim()}
                aria-label="Enviar mensaje"
                className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 hover:opacity-80"
                style={{ backgroundColor: accent, color: '#fff' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
