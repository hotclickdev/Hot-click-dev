import { normalizeProduct } from './aiChatHelpers'

function applySseEvent(eventName, parsed, assembled, productos, setMensajes) {
  if (eventName === 'products') {
    const nextProductos = (parsed.productos ?? []).map(normalizeProduct)
    setMensajes(prev => {
      const last = prev[prev.length - 1]
      if (!last?.typing) return prev
      return [...prev.slice(0, -1), { ...last, productos: nextProductos }]
    })
    return { assembled, productos: nextProductos }
  }
  if (eventName === 'delta' && parsed.text) {
    const nextAssembled = assembled + parsed.text
    setMensajes(prev => {
      const last = prev[prev.length - 1]
      if (!last?.typing) return prev
      return [...prev.slice(0, -1), { ...last, texto: nextAssembled, productos }]
    })
    return { assembled: nextAssembled, productos }
  }
  if (eventName === 'done') {
    const backendOpts = parsed.opts ?? []
    setMensajes(prev => {
      const last = prev[prev.length - 1]
      if (!last) return prev
      return [...prev.slice(0, -1), {
        rol: 'assistant', texto: assembled, productos, categorias: [],
        opts: backendOpts,
      }]
    })
    return { assembled, productos }
  }
  if (eventName === 'error') {
    setMensajes(prev => [...prev.slice(0, -1), {
      rol: 'assistant', failed: true, texto: parsed.error || 'Error al buscar productos',
    }])
  }
  return { assembled, productos }
}

/**
 * Streaming SSE del chat — mismo orden de fetch y eventos que el original.
 * @param {{ empresaSlug: string, msg: string, history: object[], context: string, focusIds: unknown[], productoId?: number | null, setMensajes: function }} args
 */
export async function streamChat({ empresaSlug, msg, history, context, focusIds = [], productoId = null, setMensajes }) {
  let assembled = ''
  let productos = []
  try {
    const response = await fetch(`/api/public/chat?slug=${encodeURIComponent(empresaSlug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msg,
        offset: 0,
        history,
        context,
        focusIds,
        ...(productoId ? { productoId } : {}),
      }),
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
            const next = applySseEvent(eventName, parsed, assembled, productos, setMensajes)
            assembled = next.assembled
            productos = next.productos
          } catch (err) { console.error(err) }
        }
      }
    }
  } catch (err) {
    console.error(err)
    const errorText = err?.message === '429'
      ? 'Muchas consultas seguidas. Esperá un momento.'
      : 'No pude conectar. Verificá tu conexión.'
    setMensajes(prev => [...prev.slice(0, -1), {
      rol: 'assistant', failed: true, failedQuery: msg, texto: errorText,
    }])
  }
}
