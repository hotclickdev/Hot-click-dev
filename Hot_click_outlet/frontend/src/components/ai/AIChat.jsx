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
import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from 'react'
import useCartStore from '@/store/cartStore'
import useChatStore from '@/store/chatStore'
import { shoppingAssistantService } from '@/services/shoppingAssistantService'
import { getOrCreateVisitorId } from '@/utils/visitorId'
import AIProductCard from './AIProductCard'
import AICategoryChip from './AICategoryChip'
import { TypingDots, AIAvatar } from './AITypingBubble'

// Renderiza **negrita** y saltos de línea sin dangerouslySetInnerHTML
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

// Botones de feedback (thumbs up / thumbs down) por mensaje
function FeedbackButtons({ msgIndex, sesionId }) {
  const [voted, setVoted] = useState(null) // 1 | -1 | null

  async function vote(rating) {
    if (voted !== null) return
    setVoted(rating)
    await shoppingAssistantService.feedback(sesionId, msgIndex, rating)
  }

  return (
    <div className="flex items-center gap-1 mt-1.5">
      <button
        onClick={() => vote(1)}
        title="Respuesta útil"
        className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:opacity-70 active:scale-90"
        style={{ color: voted === 1 ? '#178A50' : '#9CA3AF' }}
      >
        <svg className="w-3.5 h-3.5" fill={voted === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
        </svg>
      </button>
      <button
        onClick={() => vote(-1)}
        title="Puede mejorar"
        className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:opacity-70 active:scale-90"
        style={{ color: voted === -1 ? '#E73B33' : '#9CA3AF' }}
      >
        <svg className="w-3.5 h-3.5" fill={voted === -1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398C20.613 14.547 19.833 15 19 15h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 00.303-.54m.023-8.25H16.48a4.5 4.5 0 01-1.423-.23l-3.114-1.04a4.5 4.5 0 00-1.423-.23H6.504c-.618 0-1.217.247-1.605.729A11.95 11.95 0 002.25 12c0 .434.023.863.068 1.285C2.427 14.306 3.346 15 4.372 15h3.126c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.5a2.25 2.25 0 002.25 2.25.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.861-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" />
        </svg>
      </button>
      {voted !== null && (
        <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
          {voted === 1 ? 'Gracias' : 'Lo tomamos en cuenta'}
        </span>
      )}
    </div>
  )
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
  const storageKey = `hc-chat-msgs-${sessionKey}`
  const [mensajes, setMensajes] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(m => !m.typing && !m.failed) : []
    } catch { return [] }
  })
  const [input,    setInput]    = useState('')
  const [cargando, setCargando] = useState(false)
  const [sesionId, setSesionId] = useState(
    () => shoppingAssistantService.loadSesionId(sessionKey)
  )
  const visitorId  = useMemo(() => getOrCreateVisitorId(), [])
  const historyRef = useRef(null)
  const internalInputRef = useRef(null)
  const inputRef   = externalInputRef || internalInputRef
  const cargRef    = useRef(false)
  const autoSent   = useRef(false)

  const accent = accentColor || 'var(--hc-accent)'

  function setLoading(v) { cargRef.current = v; setCargando(v) }

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [mensajes])

  useEffect(() => {
    const toSave = mensajes.filter(m => !m.typing && !m.failed).slice(-30)
    try { localStorage.setItem(storageKey, JSON.stringify(toSave)) } catch { /* quota or private mode */ }
  }, [mensajes, storageKey])

  useEffect(() => {
    if (sessionKey !== 'hotclick') return
    useChatStore.getState().setMensajes(mensajes)
  }, [mensajes, sessionKey])

  useEffect(() => {
    if (sessionKey !== 'hotclick' || !sesionId) return
    useChatStore.getState().setSesionId(sesionId)
  }, [sesionId, sessionKey])

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
      imagenPrincipalUrl: producto.imagenUrl ?? null, stock: producto.stock ?? 99,
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
        opts: result.opts ?? [],
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
        opts: result.opts ?? [],
      }])
    } catch (err) {
      const errorText = err?.response?.status === 429
        ? 'Muchas consultas seguidas. Esperá un momento.'
        : 'No pude conectar. Verificá tu conexión.'
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant', failed: true, failedQuery: msg, texto: errorText,
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
  const lastAssistant = [...mensajes].reverse().find(m => m.rol === 'assistant' && !m.typing)
  const lastUserMsg = [...mensajes].reverse().find(m => m.rol === 'user')
  const contextChips = lastAssistant?.categorias?.length > 0 ? lastAssistant.categorias : null
  const activeChips = userMsgCount === 0 ? chips : (contextChips ?? [])
  const showChips = activeChips.length > 0 && !cargando

  const productoNombreCtx = context.startsWith('PRODUCTO:')
    ? context.split(':')[1] ?? null
    : null

  const showAlternativas =
    !cargando && userMsgCount > 0 && lastAssistant != null &&
    (lastAssistant.productos?.length ?? 0) === 0 && lastUserMsg != null

  const queryAlternativas = productoNombreCtx
    ? `¿Qué productos similares o alternativos a "${productoNombreCtx}" tenés disponibles?`
    : `¿Qué productos similares o relacionados con "${lastUserMsg?.texto ?? ''}" tenés disponibles?`

  // Índice de mensajes assistant (para el feedback — solo cuenta los no-typing)
  let assistantIdx = -1

  return (
    <div className="flex flex-col gap-3">

      {/* ── Historial ── */}
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
          {mensajes.map((m, i) => {
            if (m.rol === 'assistant' && !m.typing) assistantIdx++
            const currentIdx = assistantIdx
            return (
              <div
                key={i}
                className={`flex gap-2.5 ${m.rol === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                style={{ animation: 'ai-msg-in 0.25s ease both' }}
              >
                {m.rol === 'assistant' && <AIAvatar />}
                <div className="max-w-[85%] space-y-2">
                  {m.typing
                    ? <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm"
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                        <TypingDots />
                      </div>
                    : (
                      <div>
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.rol === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                          style={m.rol === 'user'
                            ? { background: accent, color: '#ffffff', fontWeight: 500 }
                            : {
                                background: m.failed ? '#FEF2F2' : '#F9FAFB',
                                color: 'var(--hc-text)',
                                border: `1px solid ${m.failed ? '#FECACA' : '#E5E7EB'}`,
                              }}
                        >
                          {m.rol === 'user'
                            ? <span style={{ whiteSpace: 'pre-wrap' }}>{m.texto}</span>
                            : <span style={{ whiteSpace: 'pre-wrap' }}><MarkdownSpan text={m.texto} /></span>
                          }
                          {m.failed && (
                            <button
                              onClick={() => {
                                setMensajes(removeMsg(m))
                                enviar(m.failedQuery)
                              }}
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
                        {/* Feedback solo en mensajes del AI que no son error */}
                        {m.rol === 'assistant' && !m.failed && sesionId && (
                          <FeedbackButtons msgIndex={currentIdx} sesionId={sesionId} />
                        )}
                      </div>
                    )
                  }

                  {!m.typing && m.productos?.length > 0 && (
                    <div className="space-y-2">
                      {m.productos.map((p, pi) => (
                        <AIProductCard key={p.id ?? pi} producto={p} similarity={p.similarity} onAdd={handleAdd} />
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
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Chips de sugerencia (solo cuando no hay mensajes) ── */}
      {showChips && userMsgCount === 0 && (
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
      )}

      {/* ── Chips de contexto (categorías después de respuesta) ── */}
      {showChips && userMsgCount > 0 && (
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
      )}

      {/* ── Chip de alternativas ── */}
      {showAlternativas && (
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
      )}

      {/* ── Input cápsula con botón integrado ── */}
      <div
        className="flex items-center gap-0 rounded-full overflow-hidden transition-all"
        style={{
          background: '#F9FAFB',
          border: '1.5px solid #E5E7EB',
        }}
        onFocus={() => {}}
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
          style={{ color: 'var(--hc-text)', caretColor: accent }}
          onFocus={e => { e.currentTarget.closest('div').style.borderColor = accent }}
          onBlur={e => { e.currentTarget.closest('div').style.borderColor = '#E5E7EB' }}
        />
        <button
          onClick={() => enviar()}
          disabled={!input.trim() || cargando}
          aria-label="Enviar"
          className="w-10 h-10 mr-1 rounded-full shrink-0 flex items-center justify-center transition-all hover:opacity-80 active:scale-95 disabled:opacity-30"
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

    </div>
  )
}
