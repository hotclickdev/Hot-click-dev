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
import { shoppingAssistantService } from '@/services/shoppingAssistantService'
import { getOrCreateVisitorId } from '@/utils/visitorId'
import AIProductCard from './AIProductCard'
import AICategoryChip from './AICategoryChip'
import { TypingDots, AIAvatar } from './AITypingBubble'

const MAX_VISIBLE_CHARS = 280

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

function TruncatedText({ texto, color }) {
  const [expanded, setExpanded] = useState(false)
  const needsTruncate = texto.length > MAX_VISIBLE_CHARS
  const visible = needsTruncate && !expanded ? texto.slice(0, MAX_VISIBLE_CHARS).trimEnd() + '…' : texto
  return (
    <Fragment>
      <span style={{ whiteSpace: 'pre-wrap' }}><MarkdownSpan text={visible} /></span>
      {needsTruncate && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="block mt-1 text-xs font-medium underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
          style={{ color }}
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
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

  // Persiste el historial en localStorage (máx 30 mensajes, sin burbujas transitorias)
  useEffect(() => {
    const toSave = mensajes.filter(m => !m.typing && !m.failed).slice(-30)
    try { localStorage.setItem(storageKey, JSON.stringify(toSave)) } catch {}
  }, [mensajes, storageKey])

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
  const contextChips = lastAssistant?.categorias?.length > 0
    ? lastAssistant.categorias
    : null
  const activeChips = userMsgCount === 0 ? chips : (contextChips ?? [])
  const showChips = activeChips.length > 0 && !cargando

  // En contexto PRODUCTO extraemos el nombre para el chip de alternativas
  const productoNombreCtx = context.startsWith('PRODUCTO:')
    ? context.split(':')[1] ?? null
    : null

  // Mostrar chip de alternativas cuando el AI respondió pero no devolvió productos
  const showAlternativas =
    !cargando &&
    userMsgCount > 0 &&
    lastAssistant != null &&
    (lastAssistant.productos?.length ?? 0) === 0 &&
    lastUserMsg != null

  const queryAlternativas = productoNombreCtx
    ? `¿Qué productos similares o alternativos a "${productoNombreCtx}" tenés disponibles?`
    : `¿Qué productos similares o relacionados con "${lastUserMsg?.texto ?? ''}" tenés disponibles?`

  return (
    <div className="flex flex-col gap-3">

      {/* ── Historial de mensajes ── */}
      {mensajes.length > 0 && (
        <div
          ref={historyRef}
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
                  ? <div className="px-3 py-2 rounded-2xl rounded-tl-sm"
                      style={{
                        background: 'var(--hc-surface-2)',
                        border: '1px solid var(--hc-border)',
                      }}>
                      <TypingDots />
                    </div>
                  : <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-snug ${m.rol === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                      style={m.rol === 'user'
                        ? { background: accent, color: '#ffffff', fontWeight: 500 }
                        : {
                            background: m.failed ? 'var(--hc-danger-bg)' : 'var(--hc-surface-2)',
                            color: 'var(--hc-text)',
                            border: `1px solid ${m.failed ? 'var(--hc-danger)' : 'var(--hc-border)'}`,
                          }}
                    >
                      {m.rol === 'user'
                        ? <span style={{ whiteSpace: 'pre-wrap' }}>{m.texto}</span>
                        : <TruncatedText texto={m.texto} color={accent} />
                      }
                      {m.failed && (
                        <button
                          onClick={() => {
                            setMensajes(prev => prev.filter(x => x !== m))
                            enviar(m.failedQuery)
                          }}
                          className="flex items-center gap-1 mt-2 text-[11px] font-medium transition-opacity hover:opacity-80"
                          style={{ color: accent }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Reintentar
                        </button>
                      )}
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
                {!m.typing && m.opts?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {m.opts.map(opt => (
                      <button
                        key={opt}
                        onClick={() => enviar(opt)}
                        className="text-[11px] px-3 py-1.5 rounded-full font-medium transition-all hover:opacity-80 active:scale-95"
                        style={{
                          background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                          color: accent,
                          border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Chips de sugerencia ── */}
      {showChips && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map(chip => (
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

      {/* ── Chip de alternativas ── */}
      {showAlternativas && (
        <button
          onClick={() => enviar(queryAlternativas)}
          className="self-start text-[11px] px-3 py-1.5 rounded-full transition-all hover:opacity-80 active:scale-95 flex items-center gap-1.5"
          style={{
            background: `color-mix(in srgb, ${accent} 10%, transparent)`,
            color: accent,
            border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
          }}
        >
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
          Ver productos similares
        </button>
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
            background: 'var(--hc-surface-2)',
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
