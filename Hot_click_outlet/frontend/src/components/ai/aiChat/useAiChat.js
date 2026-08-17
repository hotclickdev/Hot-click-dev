import { useState, useRef, useCallback, useEffect } from 'react'
import useCartStore from '@/store/cartStore'
import useChatStore from '@/store/chatStore'
import useAuthStore from '@/store/authStore'
import { normalizeProduct, isAfterHours, removeMsg } from './aiChatHelpers'

/**
 * Estado y streaming SSE del chat AI — bit-idéntico al original.
 */
export function useAiChat({
  empresaSlug = 'hotclick',
  context = 'GENERAL',
  sessionKey = 'hotclick',
  chips = [],
  autoQuery = null,
  accentColor = null,
  inputRef: externalInputRef = null,
  onProductAdd = null,
  proactiveTrigger = false,
  exitIntentEnabled = false,
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

  useEffect(() => {
    if (!autoQuery || autoSent.current) return
    autoSent.current = true
    const timer = setTimeout(() => enviarDirecto(autoQuery), 700)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleAdd = useCallback((producto) => {
    addItem({
      id: producto.id, nombre: producto.nombre, sku: producto.sku ?? '',
      precio: producto.precio, precioVenta: producto.precio,
      imagenPrincipalUrl: producto.imagenUrl ?? null, stock: producto.stock ?? 99,
    }, 1)
    onProductAdd?.(producto)
  }, [addItem, onProductAdd])

  function copyMessage(texto, idx) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    }).catch(() => {})
  }

  async function enviarDirecto(msg) {
    if (!msg?.trim() || cargRef.current) return
    setLoading(true)
    setMensajes(prev => [...prev, { rol: 'assistant', typing: true, texto: '', productos: [] }])
    await streamChat(msg.trim(), [], [])
    setLoading(false)
  }

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

  const greetingText = userName
    ? `¡Hola, ${userName.split(' ')[0]}! ¿En qué te puedo ayudar hoy?`
    : null

  return {
    mensajes,
    setMensajes,
    input,
    setInput,
    cargando,
    copiedIdx,
    afterHours,
    historyRef,
    inputRef,
    accent,
    handleAdd,
    copyMessage,
    enviar,
    onKeyDown,
    userMsgCount,
    lastAssistant,
    sessionSearches,
    showChips,
    activeChips,
    showAlternativas,
    queryAlternativas,
    isCarritoContext,
    hasProductsInLastMsg,
    greetingText,
    removeMsg,
  }
}
