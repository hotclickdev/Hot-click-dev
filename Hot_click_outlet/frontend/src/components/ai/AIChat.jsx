/**
 * AIChat — primitivo compartido de conversación HotClick AI.
 *
 * Usado por AIProductSection, AICartSection, AIPostPaySection y AIHeroSearch.
 * Gestiona internamente sesión, visitorId, historial y llamada al backend.
 *
 * Props:
 *   context        (string)   contexto backend: GENERAL | PRODUCTO:... | CARRITO:... | etc.
 *   sessionKey     (string)   clave para persistir sesionId en localStorage
 *   chips          (string[]) sugerencias rápidas visibles antes del primer mensaje
 *   placeholder    (string)   texto del input
 *   autoQuery      (string)   consulta enviada automáticamente al montar (sin mostrar burbuja user)
 *   accentColor    (string)   color de acento override (default: var(--hc-accent))
 *   maxHistoryHeight (number) alto máximo del historial antes de hacer scroll
 *   inputRef       (ref)      ref externo opcional para hacer focus desde el padre
 *   onProductAdd   (fn)       callback adicional al añadir producto al carrito
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import useCartStore from '@/store/cartStore'
import { shoppingAssistantService } from '@/services/shoppingAssistantService'
import { getOrCreateVisitorId } from '@/utils/visitorId'
import AIProductCard from './AIProductCard'
import AICategoryChip from './AICategoryChip'
import { TypingDots, AIAvatar } from './AITypingBubble'

const MSG_CSS_ID = 'hc-ai-msg-css'
if (typeof document !== 'undefined' && !document.getElementById(MSG_CSS_ID)) {
  const s = document.createElement('style')
  s.id = MSG_CSS_ID
  s.textContent = `@keyframes ai-msg-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`
  document.head.appendChild(s)
}

export default function AIChat({
  context = 'GENERAL',
  sessionKey = 'hotclick',
  chips = [],
  placeholder = '¿En qué te puedo ayudar?',
  autoQuery = null,
  accentColor = null,
  maxHistoryHeight = 320,
  inputRef: externalInputRef = null,
  onProductAdd = null,
}) {
  const addItem    = useCartStore(s => s.addItem)
  const [mensajes, setMensajes] = useState([])
  const [input,    setInput]    = useState('')
  const [cargando, setCargando] = useState(false)
  const [sesionId, setSesionId] = useState(
    () => shoppingAssistantService.loadSesionId(sessionKey)
  )
  const visitorId  = useMemo(() => getOrCreateVisitorId(), [])
  const bottomRef  = useRef(null)
  const internalInputRef = useRef(null)
  const inputRef   = externalInputRef || internalInputRef
  const cargRef    = useRef(false)
  const autoSent   = useRef(false)

  const accent = accentColor || 'var(--hc-accent)'

  function setLoading(v) { cargRef.current = v; setCargando(v) }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  useEffect(() => {
    if (!autoQuery || autoSent.current) return
    autoSent.current = true
    const timer = setTimeout(() => enviarDirecto(autoQuery), 700)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = useCallback((producto) => {
    addItem({
      id: producto.id, nombre: producto.nombre, sku: producto.sku ?? '',
      precio: producto.precio, precioVenta: producto.precio,
      imagenPrincipalUrl: producto.imagenUrl ?? null, stock: 99,
    }, 1)
    onProductAdd?.(producto)
  }, [addItem, onProductAdd])

  async function enviarDirecto(msg) {
    if (!msg?.trim() || cargRef.current) return
    setLoading(true)
    setMensajes(prev => [...prev, { rol: 'assistant', typing: true }])
    try {
      const result = await shoppingAssistantService.chat({
        empresaSlug: 'hotclick', mensaje: msg.trim(), sesionId, contexto: context, visitorId,
      })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId(sessionKey, result.sesionId)
      }
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant', texto: result.respuesta,
        productos: result.productos ?? [],
        categorias: result.categorias ?? [],
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
        empresaSlug: 'hotclick', mensaje: msg, sesionId, contexto: context, visitorId,
      })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId(sessionKey, result.sesionId)
      }
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant', texto: result.respuesta,
        productos: result.productos ?? [],
        categorias: result.categorias ?? [],
      }])
    } catch (err) {
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant',
        texto: err?.response?.status === 429
          ? 'Muchas consultas seguidas. Esperá un momento e intentá de nuevo.'
          : 'No pude conectar. Verificá tu conexión e intentá de nuevo.',
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  const userMsgCount = mensajes.filter(m => m.rol === 'user').length
  const showChips    = chips.length > 0 && userMsgCount === 0 && !cargando

  return (
    <div className="flex flex-col gap-3">

      {/* ── Historial de mensajes ── */}
      {mensajes.length > 0 && (
        <div
          className="space-y-3 overflow-y-auto"
          style={{
            maxHeight: maxHistoryHeight,
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--hc-border) transparent',
          }}
        >
          {mensajes.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2 ${m.rol === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              style={{ animation: 'ai-msg-in 0.25s ease both' }}
            >
              {m.rol === 'assistant' && <AIAvatar accentColor={accent} />}
              <div className="max-w-[85%] space-y-2">
                {m.typing
                  ? <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm"
                      style={{
                        background: 'var(--hc-surface-2, rgba(0,0,0,0.06))',
                        border: '1px solid var(--hc-border)',
                        color: 'var(--hc-muted)',
                      }}>
                      <TypingDots />
                    </div>
                  : <div
                      className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.rol === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                      style={m.rol === 'user'
                        ? { background: accent, color: '#fff' }
                        : {
                            background: 'var(--hc-surface-2, rgba(0,0,0,0.06))',
                            color: 'var(--hc-text)',
                            border: '1px solid var(--hc-border)',
                          }}
                    >
                      {m.texto}
                    </div>
                }
                {!m.typing && m.productos?.length > 0 && (
                  <div className="space-y-2">
                    {m.productos.map((p, pi) => (
                      <AIProductCard
                        key={p.id ?? pi}
                        producto={p}
                        similarity={p.similarity}
                        onAdd={handleAdd}
                      />
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
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Chips de sugerencia ── */}
      {showChips && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map(chip => (
            <button
              key={chip}
              onClick={() => enviar(chip)}
              className="text-[11px] px-3 py-1.5 rounded-full transition-all hover:opacity-80 active:scale-95"
              style={{
                background: `color-mix(in srgb, ${accent} 10%, transparent)`,
                color: accent,
                border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={cargando ? 'Buscando...' : placeholder}
          disabled={cargando}
          maxLength={500}
          className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50 transition-all"
          style={{
            background: 'var(--hc-surface-2, rgba(0,0,0,0.04))',
            border: '1px solid var(--hc-border)',
            color: 'var(--hc-text)',
            caretColor: accent,
          }}
          onFocus={e => { e.target.style.borderColor = accent }}
          onBlur={e => { e.target.style.borderColor = 'var(--hc-border)' }}
        />
        <button
          onClick={() => enviar()}
          disabled={!input.trim() || cargando}
          aria-label="Enviar"
          className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-all hover:opacity-80 active:scale-95 disabled:opacity-30"
          style={{ background: accent, color: '#fff' }}
        >
          {cargando
            ? <TypingDots color="rgba(255,255,255,0.8)" />
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
          }
        </button>
      </div>

    </div>
  )
}
