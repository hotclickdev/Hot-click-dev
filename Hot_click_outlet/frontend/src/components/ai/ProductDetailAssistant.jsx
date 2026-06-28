import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useCartStore from '@/store/cartStore'
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

const PREGUNTAS_RAPIDAS = [
  '¿Para qué sirve exactamente?',
  '¿Es fácil de instalar?',
  '¿Para qué espacio es ideal?',
  '¿Tiene garantía?',
  '¿Es compatible con Alexa / Google Home?',
  '¿Vale la pena el precio?',
]

/**
 * Agente especializado en detalle de producto.
 * Se monta embebido en la página, no es un overlay.
 *
 * @param {object} product - El producto actual de la página.
 */
export default function ProductDetailAssistant({ product }) {
  const addItem = useCartStore(s => s.addItem)
  const [abierto,  setAbierto]  = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [input,    setInput]    = useState('')
  const [cargando, setCargando] = useState(false)
  const [sesionId, setSesionId] = useState(() => shoppingAssistantService.loadSesionId('hotclick'))
  const visitorId = useMemo(() => getOrCreateVisitorId(), [])
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const cargRef   = useRef(false)

  function setLoading(v) { cargRef.current = v; setCargando(v) }

  // Contexto para el backend: PRODUCTO:nombre:precio:desc
  const contexto = product
    ? `PRODUCTO:${product.nombre}:${product.precio}:${(product.descripcionCorta ?? product.descripcion ?? '').slice(0, 120)}`
    : 'PRODUCTO'

  useEffect(() => {
    if (abierto && mensajes.length === 0) {
      setMensajes([{
        rol: 'assistant',
        texto: `¡Hola! Soy el experto en **${product?.nombre ?? 'este producto'}**. Podés preguntarme cómo funciona, para qué espacio es ideal, si se adapta a tu necesidad — lo que quieras saber.`,
      }])
      setTimeout(() => inputRef.current?.focus(), 120)
    }
    if (abierto) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [abierto])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

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
        shoppingAssistantService.saveSesionId('hotclick', result.sesionId)
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

  if (!product) return null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface)' }}
    >
      {/* ── Header / toggle ── */}
      <button
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/3"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
          style={{ background: 'color-mix(in srgb, var(--hc-accent) 15%, transparent)', color: 'var(--hc-accent)' }}>
          ✦
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            Preguntale al experto del producto
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {abierto ? '¿Este producto es para vos? Preguntame lo que necesitás.' : '¿No estás seguro si es lo que buscás? Preguntame.'}
          </p>
        </div>
        <motion.svg
          animate={{ rotate: abierto ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="w-4 h-4 shrink-0" style={{ color: 'var(--hc-muted)' }}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* ── Contenido expandible ── */}
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

              {/* Sugerencias rápidas */}
              {mensajes.length <= 1 && !cargando && (
                <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5">
                  {PREGUNTAS_RAPIDAS.map(q => (
                    <button
                      key={q}
                      onClick={() => enviar(q)}
                      className="text-[11px] px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                      style={{
                        background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
                        color: 'var(--hc-accent)',
                        border: '1px solid color-mix(in srgb, var(--hc-accent) 25%, transparent)',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Mensajes */}
              <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto"
                style={{ scrollbarWidth: 'thin' }}>
                {mensajes.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.rol === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {m.rol === 'assistant' && (
                      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={{ background: 'var(--hc-accent)', color: '#fff' }}>✦</div>
                    )}
                    <div className="max-w-[85%] space-y-2">
                      {m.typing
                        ? <div className="px-3 py-2 rounded-2xl rounded-tl-sm text-sm"
                            style={{ background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 15%, transparent)' }}>
                            <TypingDots />
                          </div>
                        : <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${m.rol === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                            style={m.rol === 'user'
                              ? { background: 'var(--hc-accent)', color: '#fff' }
                              : { background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)', color: 'var(--hc-text)', border: '1px solid color-mix(in srgb, var(--hc-accent) 12%, transparent)' }}>
                            {m.texto}
                          </div>
                      }
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={cargando ? 'Analizando...' : '¿Para qué espacio lo querés? ¿Tenés alguna duda?'}
                    disabled={cargando}
                    maxLength={400}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
                    style={{
                      background: 'var(--hc-surface-2, rgba(0,0,0,0.04))',
                      border: '1px solid var(--hc-border)',
                      color: 'var(--hc-text)',
                    }}
                  />
                  <button
                    onClick={() => enviar()}
                    disabled={!input.trim() || cargando}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30"
                    style={{ background: 'var(--hc-accent)', color: '#fff' }}
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

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
