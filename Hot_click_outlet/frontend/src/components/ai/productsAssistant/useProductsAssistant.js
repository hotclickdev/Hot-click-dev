import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import useCartStore from '@/store/cartStore'
import { shoppingAssistantService } from '@/services/shoppingAssistantService'
import { getOrCreateVisitorId } from '@/utils/visitorId'

/** Estado y handlers del panel asistente de productos — bit-idéntico al original. */
export function useProductsAssistant({ isOpen, initialQuery = '' }) {
  const addItem = useCartStore(s => s.addItem)
  const [mensajes, setMensajes] = useState([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [sesionId, setSesionId] = useState(() => shoppingAssistantService.loadSesionId('hotclick'))
  const visitorId = useMemo(() => getOrCreateVisitorId(), [])
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const cargRef = useRef(false)
  const sentInitial = useRef(false)

  function setLoading(v) { cargRef.current = v; setCargando(v) }

  useEffect(() => {
    if (!isOpen) return
    if (mensajes.length === 0 && !sentInitial.current) {
      const greeting = initialQuery
        ? `Vi que llegaste buscando "${initialQuery}". Déjame ver qué tenemos para vos.`
        : '¡Hola! Soy el asistente de HotClick. ¿Qué estás buscando hoy?'

      setTimeout(() => {
        setMensajes([{ rol: 'assistant', texto: greeting }])
        if (initialQuery) {
          sentInitial.current = true
          setTimeout(() => enviarDirecto(initialQuery), 350)
        }
      }, 180)
    } else {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const addCartItem = useCallback((producto) => {
    addItem({
      id: producto.id,
      nombre: producto.nombre,
      sku: producto.sku ?? '',
      precio: producto.precio,
      precioVenta: producto.precio,
      imagenPrincipalUrl: producto.imagenUrl ?? null,
      stock: 99,
    }, 1)
  }, [addItem])

  async function enviarDirecto(msg) {
    if (!msg || cargRef.current) return
    setLoading(true)
    setMensajes(prev => [...prev, { rol: 'assistant', typing: true }])
    try {
      const result = await shoppingAssistantService.chat({ empresaSlug: 'hotclick', mensaje: msg, sesionId, visitorId })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId('hotclick', result.sesionId)
      }
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant',
        texto: result.respuesta,
        productos: result.productos ?? [],
        categorias: result.categorias ?? [],
      }])
    } catch (err) {
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant',
        texto: err?.response?.status === 429
          ? 'Demasiadas consultas. Esperá un momento.'
          : 'Hubo un problema al conectar. Verificá que el servidor esté activo.',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function enviar(mensajeDirecto) {
    const msg = (mensajeDirecto ?? input).trim()
    if (!msg || cargRef.current) return
    setInput('')
    setLoading(true)
    setMensajes(prev => [
      ...prev,
      { rol: 'user', texto: msg },
      { rol: 'assistant', typing: true },
    ])
    try {
      const result = await shoppingAssistantService.chat({ empresaSlug: 'hotclick', mensaje: msg, sesionId, visitorId })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId('hotclick', result.sesionId)
      }
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant',
        texto: result.respuesta,
        productos: result.productos ?? [],
        categorias: result.categorias ?? [],
      }])
    } catch (err) {
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant',
        texto: err?.response?.status === 429
          ? 'Demasiadas consultas. Esperá un momento.'
          : 'Hubo un problema al conectar. Intentá de nuevo.',
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
    mensajes,
    input,
    setInput,
    cargando,
    bottomRef,
    inputRef,
    addCartItem,
    enviar,
    onKeyDown,
  }
}
