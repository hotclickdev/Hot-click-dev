import { useState, useRef, useEffect, useMemo } from 'react'
import { shoppingAssistantService } from '@/services/shoppingAssistantService'
import { getOrCreateVisitorId } from '@/utils/visitorId'

/** Estado y handlers del asistente de detalle de producto — bit-idéntico al original. */
export function useProductDetailAssistant(product) {
  const [abierto,  setAbierto]  = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [input,    setInput]    = useState('')
  const [cargando, setCargando] = useState(false)
  const sesionKey = `producto-${product?.id ?? 'hotclick'}`
  const [sesionId, setSesionId] = useState(() => shoppingAssistantService.loadSesionId(sesionKey))
  const visitorId = useMemo(() => getOrCreateVisitorId(), [])
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const cargRef   = useRef(false)

  function setLoading(v) { cargRef.current = v; setCargando(v) }

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
        productoId: product?.id ?? null,
      })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId(sesionKey, result.sesionId)
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

  return {
    abierto,
    setAbierto,
    mensajes,
    input,
    setInput,
    cargando,
    bottomRef,
    inputRef,
    enviar,
    onKeyDown,
  }
}
