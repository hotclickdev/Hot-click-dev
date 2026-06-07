import { useState, useEffect, useRef } from 'react'
import { useBranding } from '@/hooks/useBranding'
import useChatStore from '@/store/chatStore'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

const CHAT_CSS = `
  @keyframes hc-msg-bot   { from { opacity:0; transform:translateX(-10px) translateY(4px) } to { opacity:1; transform:none } }
  @keyframes hc-msg-user  { from { opacity:0; transform:translateX(10px)  translateY(4px) } to { opacity:1; transform:none } }
  @keyframes hc-fade-up   { from { opacity:0; transform:translateY(7px)  } to { opacity:1; transform:none } }
  @keyframes hc-modal-in  { from { opacity:0; transform:scale(0.95) translateY(16px) } to { opacity:1; transform:none } }
  @keyframes hc-dot       { 0%,60%,100% { transform:translateY(0);   opacity:0.3 }
                             30%         { transform:translateY(-5px); opacity:1   } }
`
if (typeof document !== 'undefined' && !document.getElementById('hc-chat-css')) {
  const s = document.createElement('style')
  s.id = 'hc-chat-css'
  s.textContent = CHAT_CSS
  document.head.appendChild(s)
}

function TypingDots({ color = 'currentColor' }) {
  return (
    <span className="inline-flex items-center gap-[3px] px-0.5 align-middle">
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
          backgroundColor: color, animation: 'hc-dot 1.1s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </span>
  )
}

function ProductoCard({ p, delay = 0 }) {
  return (
    <a href={`/productos/${p.id_producto}`}
      target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-xl p-2 hover:opacity-90 transition-opacity"
      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        animation: 'hc-fade-up 0.28s ease both', animationDelay: `${delay}ms` }}>
      {p.imagen_principal_url ? (
        <img src={p.imagen_principal_url} alt={p.nombre_producto}
          className="w-12 h-12 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <svg className="w-5 h-5 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight line-clamp-2" style={{ color: '#e8e8ed' }}>
          {p.nombre_producto}
        </p>
        <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--hc-accent, #ff4b12)' }}>
          ₡{fmt(p.precio_venta)}
        </p>
      </div>
      <svg className="w-4 h-4 shrink-0 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </a>
  )
}

function Burbuja({ msg }) {
  const isUser = msg.rol === 'user'
  const waiting = !isUser && msg.streaming && !msg.texto

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ animation: `${isUser ? 'hc-msg-user' : 'hc-msg-bot'} 0.28s ease both` }}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-base"
          style={{ backgroundColor: 'var(--hc-accent, #ff4b12)' }}>
          🛍️
        </div>
      )}
      <div className="max-w-[80%] space-y-2">
        {(msg.texto || waiting) && (
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
            style={isUser
              ? { backgroundColor: 'var(--hc-accent, #ff4b12)', color: '#fff' }
              : { backgroundColor: 'rgba(255,255,255,0.1)', color: '#e8e8ed' }}>
            {waiting
              ? <TypingDots color="rgba(255,255,255,0.65)" />
              : <>
                  {msg.texto}
                  {msg.streaming && (
                    <span className="inline-block w-[2px] h-[13px] ml-0.5 rounded-sm"
                      style={{ backgroundColor: 'currentColor', opacity: 0.7, animation: 'hc-dot 0.8s ease-in-out infinite' }} />
                  )}
                </>
            }
          </div>
        )}
        {msg.productos?.length > 0 && (
          <div className="space-y-2">
            {msg.productos.map((p, i) => <ProductoCard key={i} p={p} delay={i * 75} />)}
          </div>
        )}
        {msg.acciones && (
          <div className="flex flex-wrap gap-2 mt-1"
            style={{ animation: 'hc-fade-up 0.3s ease both', animationDelay: '60ms' }}>
            {msg.acciones.map((a, i) => (
              <button key={i} onClick={a.onClick}
                className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#e8e8ed',
                  border: '1px solid rgba(255,255,255,0.18)',
                  animation: 'hc-fade-up 0.25s ease both', animationDelay: `${60 + i * 50}ms` }}>
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
// El chat solo se abre desde el HomeChatBar (barra de inicio). No hay botón flotante.
export default function ChatWidget({ slug }) {
  const branding = useBranding(slug)
  // Si el flag está explícitamente desactivado, no renderizar nada
  if (branding !== null && branding?.chatActivo === false) return null
  return <ChatWidgetInner slug={slug} />
}

function ChatWidgetInner({ slug }) {
  const [abierto, setAbierto] = useState(false)
  const [input, setInput]     = useState('')
  const [cargando, setCargando] = useState(false)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const pendingRef = useRef(null)

  // Mensajes y actividad viven en el store global → sobreviven navegación
  const storeMensajes    = useChatStore((s) => s.mensajes)
  const storeSetMensajes = useChatStore((s) => s.setMensajes)
  const checkExpiry      = useChatStore((s) => s.checkExpiry)
  const storeOpen        = useChatStore((s) => s.isOpen)
  const storePending     = useChatStore((s) => s.pendingMessage)
  const storeClear       = useChatStore((s) => s.clearPending)
  const storeClose       = useChatStore((s) => s.close)

  // Al montar verificar si la conversación expiró (5 min sin actividad)
  useEffect(() => { checkExpiry() }, [checkExpiry])

  // Escuchar apertura desde HomeChatBar u otros componentes
  useEffect(() => {
    if (!storeOpen) return
    if (storePending) {
      pendingRef.current = storePending
      storeClear()
    }
    setAbierto(true)
    storeClose()
  }, [storeOpen, storePending, storeClear, storeClose])

  // Enviar mensaje pendiente o mostrar saludo al abrir
  useEffect(() => {
    if (!abierto) return
    if (!pendingRef.current) {
      if (storeMensajes.length === 0) {
        const t = setTimeout(() => {
          storeSetMensajes([{
            rol: 'bot',
            texto: '¡Hola! 👋 ¿Qué estás buscando hoy? Decime para qué ambiente o qué necesitás y te ayudo a encontrar opciones.',
          }])
        }, 300)
        return () => clearTimeout(t)
      }
      return
    }
    const msg = pendingRef.current
    pendingRef.current = null
    storeSetMensajes(prev => [...prev, { rol: 'user', texto: msg }])
    const t = setTimeout(() => enviar(msg), 80)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, storeOpen])

  // Scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [storeMensajes])

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [abierto])

  async function enviar(mensajeTexto, currentOffset = 0) {
    const msg = (mensajeTexto ?? input).trim()
    if (!msg || cargando) return

    setInput('')
    setCargando(true)

    if (!mensajeTexto) {
      storeSetMensajes(prev => [...prev, { rol: 'user', texto: msg }])
    }

    const token = (() => {
      try { return JSON.parse(localStorage.getItem('hotclick-auth') ?? '{}')?.state?.token ?? '' }
      catch { return '' }
    })()

    storeSetMensajes(prev => [...prev, { rol: 'bot', texto: '', streaming: true, productos: [] }])

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
          if (!line.startsWith('data:')) continue
          try {
            const raw = line.startsWith('data: ') ? line.slice(6) : line.slice(5)
            const data = JSON.parse(raw)
            if (data.productos !== undefined) {
              productos = data.productos
              hasMore   = data.hasMore
              storeSetMensajes(prev => {
                const next = [...prev]
                next[next.length - 1] = { ...next[next.length - 1], productos }
                return next
              })
            }
            if (data.text) {
              accText += data.text
              storeSetMensajes(prev => {
                const next = [...prev]
                next[next.length - 1] = { ...next[next.length - 1], texto: accText, streaming: true }
                return next
              })
            }
          } catch {}
        }
      }

      const nextOffset = currentOffset + 5
      const acciones = []
      if (hasMore) {
        acciones.push({
          label: 'Ver 5 más ▸',
          onClick: () => enviar(msg, nextOffset),
        })
      }
      acciones.push({ label: 'Buscar otra cosa 🔄', onClick: resetear })

      storeSetMensajes(prev => {
        const next = [...prev]
        next[next.length - 1] = { ...next[next.length - 1], streaming: false, acciones }
        return next
      })

    } catch {
      storeSetMensajes(prev => {
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
    storeSetMensajes([{ rol: 'bot', texto: '¡Claro! ¿Qué otro tipo de producto buscás?' }])
    inputRef.current?.focus()
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setAbierto(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const accent = 'var(--hc-accent, #ff4b12)'

  return (
    <>
      {/* El chat se abre exclusivamente desde HomeChatBar — no hay botón flotante */}

      {/* Modal centrado */}
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ animation: 'hc-fade-up 0.18s ease both' }}>

          {/* Backdrop */}
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={() => setAbierto(false)} />

          {/* Panel */}
          <div className="relative w-full max-w-lg flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{
              height: 'min(600px, 85vh)',
              backgroundColor: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.12)',
              animation: 'hc-modal-in 0.28s cubic-bezier(0.16,1,0.3,1) both',
            }}>

            {/* Header */}
            <div className="px-5 py-4 flex items-center gap-3 shrink-0"
              style={{ backgroundColor: accent }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                🛍️
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-white leading-none">Asistente de compras</p>
                <p className="text-xs text-white/70 mt-0.5">HOTCLICK — Te ayudo a encontrar lo que buscás</p>
              </div>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {storeMensajes.map((m, i) => <Burbuja key={i} msg={m} />)}
              <div ref={bottomRef} />
            </div>

            {/* Sugerencias rápidas al inicio */}
            {storeMensajes.length <= 1 && !cargando && (
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                {['Sala', 'Cocina', 'Dormitorio', 'Jardín', 'Decoración', 'Regalo'].map(s => (
                  <button key={s} onClick={() => enviar(s)}
                    className="text-xs px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#e8e8ed',
                      border: '1px solid rgba(255,255,255,0.14)' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 pt-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Escribí qué buscás..."
                  disabled={cargando}
                  autoFocus
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#e8e8ed',
                    border: '1px solid rgba(255,255,255,0.14)' }}
                />
                <button onClick={() => enviar()} disabled={cargando || !input.trim()}
                  aria-label="Enviar"
                  className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: accent, color: '#fff' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
