import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiChatMensaje } from './aiChatHelpers'
import { streamChat } from './aiChatStream'

vi.mock('@/utils/visitorId', () => ({ getOrCreateVisitorId: () => '0b5f2c1e-3f0a-4d0e-9a52-1d6f0c9a7b11' }))

function sse(texto: string) {
  const bytes = new TextEncoder().encode(texto)
  return new Response(new ReadableStream({
    start(c) { c.enqueue(bytes); c.close() },
  }), { status: 200 })
}

async function correr(respuesta: Response) {
  const fetchMock = vi.fn().mockResolvedValue(respuesta)
  vi.stubGlobal('fetch', fetchMock)
  let mensajes: AiChatMensaje[] = [{ rol: 'user', texto: 'hola' }, { rol: 'assistant', typing: true, texto: '' }]
  const setMensajes = (fn: AiChatMensaje[] | ((p: AiChatMensaje[]) => AiChatMensaje[])) => {
    mensajes = typeof fn === 'function' ? fn(mensajes) : fn
  }
  await streamChat({ empresaSlug: 'casa-luna', msg: 'hola', history: [], context: '', setMensajes })
  return { fetchMock, mensajes }
}

describe('streamChat: cupo diario del asistente', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('manda el visitorId en el cuerpo', async () => {
    const { fetchMock } = await correr(sse('event: done\ndata: {"opts":[]}\n\n'))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.visitorId).toBe('0b5f2c1e-3f0a-4d0e-9a52-1d6f0c9a7b11')
  })

  it('el aviso de límite no es una falla y trae los botones', async () => {
    const data = JSON.stringify({
      error: 'Llegaste al límite de consultas por hoy.',
      limite: true,
      acciones: [{ tipo: 'buscar', label: 'Buscar productos', url: '/productos' }],
    })
    const { mensajes } = await correr(sse(`event: error\ndata: ${data}\n\n`))
    const ultimo = mensajes[mensajes.length - 1]
    expect(ultimo.failed).toBeUndefined()
    expect(ultimo.texto).toBe('Llegaste al límite de consultas por hoy.')
    expect(ultimo.acciones).toEqual([{ tipo: 'buscar', label: 'Buscar productos', url: '/productos' }])
  })

  it('un error normal sigue marcándose como fallido', async () => {
    const { mensajes } = await correr(sse('event: error\ndata: {"error":"boom"}\n\n'))
    expect(mensajes[mensajes.length - 1].failed).toBe(true)
  })
})
