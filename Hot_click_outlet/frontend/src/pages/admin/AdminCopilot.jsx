import { useState, useEffect, useRef } from 'react'
import api from '@/services/api'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

function Msg({ rol, contenido, streaming }) {
  const isUser = rol === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
        style={isUser
          ? { backgroundColor: 'var(--hc-accent)', color: '#fff' }
          : { backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--hc-text)' }}>
        {isUser ? 'Tú' : '🤖'}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
        style={isUser
          ? { backgroundColor: 'var(--hc-accent)', color: '#fff' }
          : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
        {contenido}
        {streaming && <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse rounded-sm bg-current opacity-70" />}
      </div>
    </div>
  )
}

export default function AdminCopilot() {
  const [mensajes, setMensajes]   = useState([])
  const [input, setInput]         = useState('')
  const [enviando, setEnviando]   = useState(false)
  const [uso, setUso]             = useState(null)
  const [streamText, setStreamText] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  function scrollBottom() { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }

  async function cargarHistorial() {
    try {
      const [{ data: hist }, { data: u }] = await Promise.all([
        api.get('/admin/ai/historial'),
        api.get('/admin/ai/uso'),
      ])
      setMensajes(Array.isArray(hist) ? hist : [])
      setUso(u)
    } catch {}
  }

  useEffect(() => { cargarHistorial() }, [])
  useEffect(() => { scrollBottom() }, [mensajes, streamText])

  async function enviar(e) {
    e?.preventDefault()
    const msg = input.trim()
    if (!msg || enviando) return

    setInput('')
    setEnviando(true)
    setStreamText('')

    // Optimistic user message
    setMensajes(prev => [...prev, { rol: 'user', contenido: msg }])

    try {
      const rawAuth = localStorage.getItem('hotclick-auth')
      const token = rawAuth ? (JSON.parse(rawAuth)?.state?.token ?? '') : ''

      const response = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
                setMensajes(prev => [...prev, { rol: 'assistant', contenido: `⚠️ ${parsed.error}` }])
                setStreamText('')
              }
            } catch {}
          } else if (line.startsWith('event: done')) {
            // response complete
          }
        }
      }

      if (assembled) {
        setMensajes(prev => [...prev, { rol: 'assistant', contenido: assembled }])
        setStreamText('')
      }

      // Refresh usage
      try { const { data: u } = await api.get('/admin/ai/uso'); setUso(u) } catch {}

    } catch (err) {
      setMensajes(prev => [...prev, { rol: 'assistant', contenido: `⚠️ Error: ${err.message}` }])
      setStreamText('')
    } finally {
      setEnviando(false)
      textareaRef.current?.focus()
    }
  }

  async function limpiar() {
    if (!confirm('¿Limpiar el historial de conversación?')) return
    try { await api.delete('/admin/ai/historial'); setMensajes([]) } catch {}
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  const pctUso = uso?.porcentaje ?? 0
  const pctColor = pctUso >= 90 ? '#f87171' : pctUso >= 70 ? '#fbbf24' : '#34d399'

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 py-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>
            🤖 AI Copilot
          </h1>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            Powered by Claude · Contexto en tiempo real de tu negocio
          </p>
        </div>
        <div className="flex items-center gap-3">
          {uso && (
            <div className="text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--hc-muted)' }}>
                  {uso.llamadas}/{uso.limite < 0 ? '∞' : uso.limite} llamadas · {uso.plan}
                </span>
              </div>
              {uso.limite > 0 && (
                <div className="w-32 h-1.5 rounded-full" style={{ backgroundColor: 'var(--hc-bg)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pctUso}%`, backgroundColor: pctColor }} />
                </div>
              )}
            </div>
          )}
          <button onClick={limpiar} className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
            style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
            Limpiar
          </button>
        </div>
      </div>

      {/* Disabled state */}
      {uso && !uso.habilitado && (
        <div className="rounded-2xl p-5 text-center mb-3 space-y-2"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="text-sm font-semibold text-red-400">AI Copilot no disponible en tu plan actual</p>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            Actualiza a PRO (50 consultas/mes) o ENTERPRISE (500 consultas/mes)
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {mensajes.length === 0 && !streamText && (
          <div className="text-center py-12 space-y-3">
            <div className="text-5xl">🤖</div>
            <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>HotClick Copilot</p>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--hc-muted)' }}>
              Pregúntame sobre tus ventas, inventario, clientes o cualquier aspecto de tu negocio.
              Tengo acceso en tiempo real a tus datos.
            </p>
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              {[
                '¿Cómo van las ventas esta semana?',
                '¿Qué productos tienen stock bajo?',
                '¿Cuáles son mis productos más vendidos?',
                'Dame un resumen de mi negocio',
              ].map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-xl hover:opacity-80"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <Msg key={i} rol={m.rol} contenido={m.contenido} />
        ))}

        {streamText && (
          <Msg rol="assistant" contenido={streamText} streaming />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3" style={{ borderTop: '1px solid var(--hc-border)' }}>
        <form onSubmit={enviar} className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={uso?.habilitado === false ? 'AI Copilot no disponible en tu plan' : 'Pregunta sobre tu negocio… (Enter para enviar, Shift+Enter = nueva línea)'}
            disabled={enviando || (uso && !uso.habilitado)}
            rows={2}
            className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none resize-none disabled:opacity-50"
            style={{
              backgroundColor: 'var(--hc-surface)',
              border: '1.5px solid var(--hc-border)',
              color: 'var(--hc-text)',
            }}
          />
          <button type="submit" disabled={enviando || !input.trim() || (uso && !uso.habilitado)}
            className="px-4 rounded-2xl font-semibold text-sm disabled:opacity-40 hover:opacity-80 transition-all"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff', minWidth: 56 }}>
            {enviando ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : '↑'}
          </button>
        </form>
        <p className="text-[10px] text-center mt-1.5" style={{ color: 'var(--hc-muted)' }}>
          Las respuestas se generan con IA y pueden contener errores. Verifica datos importantes.
        </p>
      </div>
    </div>
  )
}
