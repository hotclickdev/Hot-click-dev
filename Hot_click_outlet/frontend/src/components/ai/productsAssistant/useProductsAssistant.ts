import { useState, useEffect, useRef, useCallback, useMemo, type KeyboardEvent } from 'react'
import useCartStore from '@/store/cartStore'
import { shoppingAssistantService } from '@/services/shoppingAssistantService'
import { getOrCreateVisitorId } from '@/utils/visitorId'
import type { Producto } from '@/types/producto'
import type { MensajeAsistenteProductos, ProductoSugerido } from './productsAssistantHelpers'

type RespuestaChatProductos = {
  respuesta?: string
  sesionId?: string | null
  productos?: ProductoSugerido[]
  categorias?: string[]
}

/** Estado y handlers del panel asistente de productos — bit-idéntico al original. */
export function useProductsAssistant({ isOpen, initialQuery = '' }: { isOpen: boolean; initialQuery?: string }) {
  const addItem = useCartStore(s => s.addItem)
  const [mensajes, setMensajes] = useState<MensajeAsistenteProductos[]>([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [sesionId, setSesionId] = useState(() => shoppingAssistantService.loadSesionId('hotclick'))
  const visitorId = useMemo(() => getOrCreateVisitorId(), [])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cargRef = useRef(false)
  const sentInitial = useRef(false)

  function setLoading(v: boolean) { cargRef.current = v; setCargando(v) }

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

  const addCartItem = useCallback((producto: ProductoSugerido) => {
    addItem({
      id: producto.id,
      nombre: producto.nombre,
      sku: producto.sku ?? '',
      precio: producto.precio,
      precioVenta: producto.precio,
      imagenPrincipalUrl: producto.imagenUrl ?? null,
      stock: 99,
    } as unknown as Producto, 1)
  }, [addItem])

  async function enviarDirecto(msg: string) {
    if (!msg || cargRef.current) return
    setLoading(true)
    setMensajes(prev => [...prev, { rol: 'assistant', typing: true }])
    try {
      const result: RespuestaChatProductos = await shoppingAssistantService.chat({ empresaSlug: 'hotclick', mensaje: msg, sesionId, visitorId })
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
    } catch (err: unknown) {
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant',
        texto: statusRespuesta(err) === 429
          ? 'Demasiadas consultas. Esperá un momento.'
          : 'Hubo un problema al conectar. Verificá que el servidor esté activo.',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function enviar(mensajeDirecto?: string) {
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
      const result: RespuestaChatProductos = await shoppingAssistantService.chat({ empresaSlug: 'hotclick', mensaje: msg, sesionId, visitorId })
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
    } catch (err: unknown) {
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant',
        texto: statusRespuesta(err) === 429
          ? 'Demasiadas consultas. Esperá un momento.'
          : 'Hubo un problema al conectar. Intentá de nuevo.',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
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

function statusRespuesta(err: unknown): number | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) return undefined
  const status = (err as { response?: { status?: number } }).response?.status
  return typeof status === 'number' ? status : undefined
}
