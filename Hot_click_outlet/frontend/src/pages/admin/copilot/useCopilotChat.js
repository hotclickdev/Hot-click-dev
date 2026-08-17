import { useState, useEffect, useRef, useCallback } from 'react'
import { copilotService } from '@/services/copilotService'
import { ofertaService } from '@/services/ofertaService'

/**
 * Estado y handlers del chat copilot admin — bit-idéntico al original.
 */
export function useCopilotChat() {
  const [mensajes, setMensajes] = useState([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [uso, setUso] = useState(null)
  const [sugerencias, setSugerencias] = useState([])
  const [accionables, setAccionables] = useState([])
  const [confirmandoId, setConfirmandoId] = useState(null)
  const [aplicandoId, setAplicandoId] = useState(null)
  const [streamText, setStreamText] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const scrollBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const cargarHistorial = useCallback(async () => {
    try {
      const [{ data: hist }, { data: u }] = await Promise.all([
        copilotService.getHistorial(),
        copilotService.getUso(),
      ])
      setMensajes(Array.isArray(hist) ? hist : [])
      setUso(u)
    } catch { /* non-critical */ }

    try {
      const { data: s } = await copilotService.getSugerencias()
      setSugerencias(Array.isArray(s) ? s : [])
    } catch { /* non-critical */ }

    try {
      const { data: a } = await copilotService.getProductosSinVenta()
      setAccionables(Array.isArray(a) ? a : [])
    } catch { /* non-critical */ }
  }, [])

  const aplicarDescuento = useCallback(async (producto) => {
    setAplicandoId(producto.id)
    try {
      await ofertaService.aplicar(producto.id, true, producto.descuentoSugeridoPct)
      setAccionables((prev) => prev.filter((p) => p.id !== producto.id))
      setConfirmandoId(null)
    } catch {
      alert('No se pudo aplicar el descuento. Intentá de nuevo desde Ofertas.')
    } finally {
      setAplicandoId(null)
    }
  }, [])

  useEffect(() => { cargarHistorial() }, [cargarHistorial])
  useEffect(() => { scrollBottom() }, [mensajes, streamText, scrollBottom])

  const enviar = useCallback(async (e) => {
    e?.preventDefault()
    const msg = input.trim()
    if (!msg || enviando) return

    setInput('')
    setEnviando(true)
    setStreamText('')
    setMensajes((prev) => [...prev, { rol: 'user', contenido: msg }])

    try {
      const rawAuth = localStorage.getItem('hotclick-auth')
      const token = rawAuth ? (JSON.parse(rawAuth)?.state?.token ?? '') : ''

      const response = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: msg }),
      })

      if (!response.ok) { throw new Error('Error del servidor') }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assembled = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim()
            if (!data) continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                assembled += parsed.text
                setStreamText(assembled)
                scrollBottom()
              }
              if (parsed.error) {
                setMensajes((prev) => [...prev, { rol: 'assistant', contenido: `⚠️ ${parsed.error}` }])
                setStreamText('')
              }
            } catch { /* non-critical */ }
          } else if (line.startsWith('event: done')) {
            // response complete
          }
        }
      }

      if (assembled) {
        setMensajes((prev) => [...prev, { rol: 'assistant', contenido: assembled }])
        setStreamText('')
      }

      try { const { data: u } = await copilotService.getUso(); setUso(u) } catch { /* non-critical */ }
    } catch (err) {
      setMensajes((prev) => [...prev, { rol: 'assistant', contenido: `⚠️ Error: ${err.message}` }])
      setStreamText('')
    } finally {
      setEnviando(false)
      textareaRef.current?.focus()
    }
  }, [input, enviando, scrollBottom])

  const limpiar = useCallback(async () => {
    if (!confirm('¿Limpiar el historial de conversación?')) return
    try { await copilotService.deleteHistorial(); setMensajes([]) } catch { /* non-critical */ }
  }, [])

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }, [enviar])

  const pctUso = uso?.porcentaje ?? 0
  const pctColor = pctUso >= 90 ? '#f87171' : pctUso >= 70 ? '#fbbf24' : '#34d399'

  return {
    mensajes,
    input,
    setInput,
    enviando,
    uso,
    sugerencias,
    accionables,
    confirmandoId,
    setConfirmandoId,
    aplicandoId,
    streamText,
    bottomRef,
    textareaRef,
    aplicarDescuento,
    enviar,
    limpiar,
    onKeyDown,
    pctUso,
    pctColor,
  }
}
