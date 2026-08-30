import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent } from 'react'
import { copilotService } from '@/services/copilotService'
import { ofertaService } from '@/services/ofertaService'
import {
  COPILOT_CHIPS_FIJOS,
  parseCopilotSse,
  mensajeErrorStream,
  type CopilotChip,
  type CopilotInsights,
  type CopilotMensaje,
  type CopilotProductoInsight,
  type CopilotUso,
} from './copilotChatHelpers'

export function useCopilotChat() {
  const [mensajes, setMensajes] = useState<CopilotMensaje[]>([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [uso, setUso] = useState<CopilotUso | null>(null)
  const [sugerencias, setSugerencias] = useState<CopilotChip[]>([])
  const [insights, setInsights] = useState<CopilotInsights>({ lentos: [], enRiesgo: [], reponerMas: [] })
  const [confirmandoId, setConfirmandoId] = useState<number | string | null>(null)
  const [aplicandoId, setAplicandoId] = useState<number | string | null>(null)
  const [streamText, setStreamText] = useState('')
  const [limpiarOpen, setLimpiarOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const cargarHistorial = useCallback(async () => {
    try {
      const [{ data: hist }, { data: u }] = await Promise.all([
        copilotService.getHistorial(),
        copilotService.getUso(),
      ])
      setMensajes(Array.isArray(hist) ? hist as CopilotMensaje[] : [])
      setUso(u as CopilotUso)
    } catch (err: unknown) { console.error(err) }

    try {
      const { data: s } = await copilotService.getSugerencias()
      setSugerencias(Array.isArray(s) ? s as CopilotChip[] : [])
    } catch (err: unknown) { console.error(err) }

    try {
      const { data: a } = await copilotService.getInsights()
      const insightsData = a as CopilotInsights | undefined
      setInsights({
        lentos: Array.isArray(insightsData?.lentos) ? insightsData.lentos : [],
        enRiesgo: Array.isArray(insightsData?.enRiesgo) ? insightsData.enRiesgo : [],
        reponerMas: Array.isArray(insightsData?.reponerMas) ? insightsData.reponerMas : [],
      })
    } catch (err: unknown) { console.error(err) }
  }, [])

  const aplicarDescuento = useCallback(async (producto: CopilotProductoInsight) => {
    setAplicandoId(producto.id)
    try {
      await ofertaService.aplicar(producto.id, true, producto.descuentoSugeridoPct as number)
      setInsights((prev) => ({
        ...prev,
        lentos: prev.lentos.filter((p) => p.id !== producto.id),
      }))
      setConfirmandoId(null)
    } catch {
      alert('No se pudo aplicar el descuento. Intentá de nuevo desde Ofertas.')
    } finally {
      setAplicandoId(null)
    }
  }, [])

  useEffect(() => { cargarHistorial() }, [cargarHistorial])
  useEffect(() => { scrollBottom() }, [mensajes, streamText, scrollBottom])

  const enviarTexto = useCallback(async (textoLibre?: string) => {
    const msg = (textoLibre ?? '').trim()
    if (!msg || enviando) return

    setInput('')
    setEnviando(true)
    setStreamText('')
    setMensajes((prev) => [...prev, { rol: 'user', contenido: msg }])

    try {
      const resultado = await streamCopilot(msg, setStreamText, scrollBottom)
      if (resultado.error) {
        setMensajes((prev) => [...prev, { rol: 'assistant', contenido: resultado.error }])
        setStreamText('')
      } else if (resultado.text) {
        setMensajes((prev) => [...prev, { rol: 'assistant', contenido: resultado.text }])
        setStreamText('')
      }
      try { const { data: u } = await copilotService.getUso(); setUso(u as CopilotUso) } catch (err: unknown) { console.error(err) }
    } catch (err: unknown) {
      setMensajes((prev) => [...prev, {
        rol: 'assistant',
        contenido: mensajeErrorStream(err),
      }])
      setStreamText('')
    } finally {
      setEnviando(false)
      textareaRef.current?.focus()
    }
  }, [enviando, scrollBottom])

  const enviar = useCallback((e?: FormEvent | { preventDefault: () => void }) => {
    e?.preventDefault()
    return enviarTexto(input)
  }, [enviarTexto, input])

  const pedirLimpiar = useCallback(() => setLimpiarOpen(true), [])

  const confirmarLimpiar = useCallback(async () => {
    try {
      await copilotService.deleteHistorial()
      setMensajes([])
      setLimpiarOpen(false)
    } catch (err: unknown) { console.error(err) }
  }, [])

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }, [enviar])

  const pctUso = uso?.porcentaje ?? 0
  const pctColor = colorPctUso(pctUso)
  const chipsFijos = COPILOT_CHIPS_FIJOS

  return {
    mensajes,
    input,
    setInput,
    enviando,
    uso,
    sugerencias,
    insights,
    chipsFijos,
    confirmandoId,
    setConfirmandoId,
    aplicandoId,
    streamText,
    bottomRef,
    textareaRef,
    aplicarDescuento,
    enviar,
    enviarTexto,
    pedirLimpiar,
    confirmarLimpiar,
    limpiarOpen,
    setLimpiarOpen,
    onKeyDown,
    pctUso,
    pctColor,
  }
}

function colorPctUso(pctUso: number) {
  if (pctUso >= 90) return '#f87171'
  if (pctUso >= 70) return '#fbbf24'
  return '#34d399'
}

async function streamCopilot(
  msg: string,
  setStreamText: (text: string) => void,
  scrollBottom: () => void,
) {
  const rawAuth = localStorage.getItem('hotclick-auth')
  const token = rawAuth ? ((JSON.parse(rawAuth) as { state?: { token?: string } })?.state?.token ?? '') : ''
  const response = await fetch('/api/admin/ai/chat', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message: msg }),
  })
  if (response.status === 429) {
    return { text: '', error: 'Mandaste muchas consultas seguidas. Esperá un momento.' }
  }
  if (!response.ok) throw new Error('servidor')
  if (!response.body) throw new Error('network error')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let assembled = ''
  let eventName = 'message'

  let sseError = ''
  let doneEvent = false
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const parsed = parseCopilotSse(line, eventName)
      eventName = parsed.eventName
      if (parsed.done) doneEvent = true
      if (parsed.error) sseError = parsed.error
      if (parsed.text) {
        assembled += parsed.text
        setStreamText(assembled)
        scrollBottom()
      }
    }
  }
  if (sseError) return { text: assembled, error: sseError }
  if (!assembled && !doneEvent) {
    return { text: '', error: 'Se cortó la conexión con Hot. Esperá un segundo y volvé a preguntar.' }
  }
  return { text: assembled, error: sseError }
}
