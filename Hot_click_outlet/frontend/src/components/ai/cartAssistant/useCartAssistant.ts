import { useState, useRef, useCallback, useEffect, useMemo, type KeyboardEvent } from 'react'
import useCartStore from '@/store/cartStore'
import useChatStore from '@/store/chatStore'
import { shoppingAssistantService } from '@/services/shoppingAssistantService'
import { getOrCreateVisitorId } from '@/utils/visitorId'
import type { ItemCarrito } from '@/types/carrito'
import type { Producto } from '@/types/producto'
import type { MensajeAsistenteCarrito, ProductoSugerido } from './cartAssistantHelpers'

type RespuestaChatCarrito = {
  respuesta?: string
  sesionId?: string | null
  productos?: ProductoSugerido[]
}

/** Estado y handlers del asistente de carrito — bit-idéntico al original. */
export function useCartAssistant({ cartItems, cartTotal }: { cartItems: ItemCarrito[]; cartTotal: number }) {
  const addItem        = useCartStore(s => s.addItem)
  const mensajesChat   = useChatStore(s => s.mensajes)
  const [abierto,  setAbierto]  = useState(false)
  const [mensajes, setMensajes] = useState<MensajeAsistenteCarrito[]>([])
  const [input,    setInput]    = useState('')
  const [cargando, setCargando] = useState(false)
  const [sesionId, setSesionId] = useState(() => shoppingAssistantService.loadSesionId('hotclick-cart'))
  const visitorId = useMemo(() => getOrCreateVisitorId(), [])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const cargRef   = useRef(false)
  const initialized = useRef(false)

  function setLoading(v: boolean) { cargRef.current = v; setCargando(v) }

  const itemsStr = cartItems.map(i => i.nombre).join(', ') || 'ninguno'
  const contexto = `CARRITO:${itemsStr}:${cartTotal}`

  const busquedasPrevias = mensajesChat
    .filter(m => m.rol === 'user')
    .slice(-3)
    .map(m => m.texto)
    .join(', ')

  useEffect(() => {
    if (abierto && !initialized.current) {
      initialized.current = true
      const itemSuffix = cartItems.length === 1 ? '' : 's'
      const greeting = busquedasPrevias
        ? `Vi que preguntaste por: "${busquedasPrevias}". Basándome en tu pedido, déjame sugerirte qué más podría interesarte...`
        : `Tenés ${cartItems.length} producto${itemSuffix} en tu pedido. ¿Puedo sugerirte algo que complemente tu compra?`

      setMensajes([{ rol: 'assistant', texto: greeting }])

      if (busquedasPrevias && cartItems.length > 0) {
        const autoQuery = `Tengo en el pedido: ${itemsStr}. También pregunté por: ${busquedasPrevias}. ¿Qué más me recomendás?`
        setTimeout(() => enviarDirecto(autoQuery), 400)
      }
    }
    if (abierto) setTimeout(() => inputRef.current?.focus(), 120)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const addCartItem = useCallback((p: ProductoSugerido) => {
    addItem({ id: p.id, nombre: p.nombre, sku: p.sku ?? '', precio: p.precio,
      precioVenta: p.precio, imagenPrincipalUrl: p.imagenUrl ?? null, stock: 99 } as unknown as Producto, 1)
  }, [addItem])

  async function enviarDirecto(msg: string) {
    if (!msg || cargRef.current) return
    setLoading(true)
    setMensajes(prev => [...prev, { rol: 'assistant', typing: true }])
    try {
      const result: RespuestaChatCarrito = await shoppingAssistantService.chat({
        empresaSlug: 'hotclick', mensaje: msg, sesionId, contexto, visitorId,
      })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId('hotclick-cart', result.sesionId)
      }
      setMensajes(prev => [...prev.slice(0, -1), {
        rol: 'assistant', texto: result.respuesta, productos: result.productos ?? [],
      }])
    } catch {
      setMensajes(prev => prev.slice(0, -1))
    } finally { setLoading(false) }
  }

  async function enviar(mensajeDirecto?: string) {
    const msg = (mensajeDirecto ?? input).trim()
    if (!msg || cargRef.current) return
    setInput('')
    setLoading(true)
    setMensajes(prev => [...prev,
      { rol: 'user', texto: msg },
      { rol: 'assistant', typing: true },
    ])
    try {
      const result: RespuestaChatCarrito = await shoppingAssistantService.chat({
        empresaSlug: 'hotclick', mensaje: msg, sesionId, contexto, visitorId,
      })
      if (result.sesionId && result.sesionId !== sesionId) {
        setSesionId(result.sesionId)
        shoppingAssistantService.saveSesionId('hotclick-cart', result.sesionId)
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

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
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
    busquedasPrevias,
    addCartItem,
    enviar,
    onKeyDown,
  }
}
