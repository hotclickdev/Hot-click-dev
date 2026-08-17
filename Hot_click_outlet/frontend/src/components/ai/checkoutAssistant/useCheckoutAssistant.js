import { useState, useRef, useEffect, useMemo } from 'react'
import { shoppingAssistantService } from '@/services/shoppingAssistantService'
import { getOrCreateVisitorId } from '@/utils/visitorId'
import { buildInitialMessages } from './checkoutAssistantHelpers'

/** Estado y handlers del asistente post-checkout — bit-idéntico al original. */
export function useCheckoutAssistant({ tipo, numeroPedido = '', metodoPago = '', errorCode = '', usuarioDatos = {} }) {
  const [mensajes, setMensajes] = useState([])
  const [input,    setInput]    = useState('')
  const [cargando, setCargando] = useState(false)
  const [sesionId, setSesionId] = useState(() => shoppingAssistantService.loadSesionId(`hotclick-checkout-${numeroPedido}`))
  const visitorId = useMemo(() => getOrCreateVisitorId(), [])
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const cargRef    = useRef(false)
  const initialized = useRef(false)

  function setLoading(v) { cargRef.current = v; setCargando(v) }

  const contexto = tipo === 'success'
    ? `PAGO_EXITO:${metodoPago}:${numeroPedido}`
    : `PAGO_FALLO:${errorCode}`

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const { mensajeInicial, autoQuery } = buildInitialMessages(tipo, numeroPedido, metodoPago, errorCode, usuarioDatos)
    setMensajes([{ rol: 'assistant', texto: mensajeInicial }])
    setTimeout(() => enviarDirecto(autoQuery), 450)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  async function enviarDirecto(msg) {
    if (!msg || cargRef.current) return
    setLoading(true)
    setMensajes(prev => [...prev, { rol: 'assistant', typing: true }])
    try {
      const result = await shoppingAssistantService.chat({
        empresaSlug: 'hotclick', mensaje: msg, sesionId, contexto, visitorId,
      })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId(`hotclick-checkout-${numeroPedido}`, result.sesionId)
      }
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant', texto: result.respuesta, productos: result.productos ?? [],
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
        empresaSlug: 'hotclick', mensaje: msg, sesionId, contexto, visitorId,
      })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId(`hotclick-checkout-${numeroPedido}`, result.sesionId)
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

  const isSuccess = tipo === 'success'
  const accentColor = isSuccess ? '#22c55e' : 'var(--hc-accent)'
  const subtitleText = isSuccess
    ? 'Confirmá tus datos para que podamos contactarte.'
    : 'Te ayudamos a resolver el problema.'

  return {
    mensajes,
    input,
    setInput,
    cargando,
    bottomRef,
    inputRef,
    enviar,
    onKeyDown,
    isSuccess,
    accentColor,
    subtitleText,
  }
}
