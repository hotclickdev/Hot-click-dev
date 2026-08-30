import { useState, useRef, useCallback, type KeyboardEvent, type RefObject } from 'react'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { isAfterHours, removeMsg } from './aiChatHelpers'
import type { AiChatMensaje } from './aiChatHelpers'
import { loadMensajes, loadSessionSearches } from './aiChatStorage'
import { streamChat } from './aiChatStream'
import { deriveAiChatView } from './aiChatDerived'
import { useAiChatEffects } from './useAiChatEffects'
import { trackAiUserMsg } from './aiChatBehavior'
import { surfaceFromSessionKey } from './chatSurface'
import type { AIChatProps } from '../AIChat'
import type { Producto } from '@/types/producto'

type UseAiChatArgs = Pick<AIChatProps,
  | 'empresaSlug'
  | 'context'
  | 'productoId'
  | 'sessionKey'
  | 'chips'
  | 'autoQuery'
  | 'accentColor'
  | 'inputRef'
  | 'onProductAdd'
  | 'proactiveTrigger'
  | 'exitIntentEnabled'
>

/**
 * Estado y streaming SSE del chat AI — bit-idéntico al original.
 */
export function useAiChat({
  empresaSlug = 'hotclick',
  context = 'GENERAL',
  productoId = null,
  sessionKey = 'hotclick',
  chips = [],
  autoQuery = null,
  accentColor = null,
  inputRef: externalInputRef = null,
  onProductAdd = null,
  proactiveTrigger = false,
  exitIntentEnabled = false,
}: UseAiChatArgs) {
  const addItem    = useCartStore(s => s.addItem)
  const userName   = useAuthStore(s => s.userName)
  const storageKey = `hc-chat-msgs-${sessionKey}`
  const searchKey  = `hc-chat-searches-${sessionKey}`

  const [mensajes, setMensajes] = useState<AiChatMensaje[]>(() => loadMensajes(storageKey))
  const [sessionSearches, setSessionSearches] = useState<string[]>(() => loadSessionSearches(searchKey))

  const [input,        setInput]        = useState('')
  const [cargando,     setCargando]     = useState(false)
  const [copiedIdx,    setCopiedIdx]    = useState<number | null>(null)
  const [proactiveSent, setProactiveSent] = useState(false)
  const [exitShown,    setExitShown]    = useState(false)
  const [afterHours]                    = useState(isAfterHours)

  const historyRef       = useRef<HTMLDivElement | null>(null)
  const internalInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const inputRef         = (externalInputRef || internalInputRef) as RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  const cargRef          = useRef(false)
  const autoSent         = useRef(false)

  const accent = accentColor || 'var(--hc-accent)'

  function setLoading(v: boolean) { cargRef.current = v; setCargando(v) }

  async function enviarDirecto(msg?: string) {
    if (!msg?.trim() || cargRef.current) return
    setLoading(true)
    setMensajes(prev => [...prev, { rol: 'assistant', typing: true, texto: '', productos: [] }])
    await streamChat({ empresaSlug, msg: msg.trim(), history: [], context, focusIds: [], productoId, setMensajes })
    setLoading(false)
  }

  useAiChatEffects({
    mensajes, storageKey, sessionKey, searchKey, sessionSearches,
    historyRef, autoQuery, autoSent, enviarDirecto,
    proactiveTrigger, proactiveSent, setProactiveSent, userName, setMensajes, cargRef,
    exitIntentEnabled, exitShown, setExitShown,
  })

  const handleAdd = useCallback((producto: Producto) => {
    addItem({
      id: producto.id, nombre: producto.nombre, sku: producto.sku ?? '',
      precio: producto.precio, precioVenta: producto.precio,
      imagenPrincipalUrl: producto.imagenUrl ?? null, stock: producto.stock ?? 99,
    } as unknown as Producto, 1)
    onProductAdd?.(producto)
  }, [addItem, onProductAdd])

  function copyMessage(texto: string, idx: number) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    }).catch((err: unknown) => { console.error(err) })
  }

  function lastShownProductIds() {
    const last = [...mensajes].reverse().find(m => (m.productos?.length ?? 0) > 0)
    return last ? last.productos!.map(p => p.id).filter(Boolean) as Array<string | number> : []
  }

  async function enviar(mensajeDirecto?: string) {
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
      .slice(-24)
      .map(m => ({ rol: m.rol, texto: m.texto }))
    const focusIds = productoId ? [productoId] : lastShownProductIds()
    trackAiUserMsg(surfaceFromSessionKey(sessionKey))
    setMensajes(prev => [...prev,
      { rol: 'user', texto: msg },
      { rol: 'assistant', typing: true, texto: '', productos: [] },
    ])
    await streamChat({ empresaSlug, msg, history, context, focusIds, productoId, setMensajes })
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  const derived = deriveAiChatView({ mensajes, chips, cargando, context, userName, productoId })

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
    sessionSearches,
    removeMsg,
    ...derived,
  }
}
