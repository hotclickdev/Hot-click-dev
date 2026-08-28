import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconoEnviar, IconoVolver } from './VisitanteIcons'
import { visitanteRuta } from './visitanteMock'

type Mensaje = { id: string; rol: 'bot' | 'user'; texto: string }

const SALUDO: Mensaje = {
  id: 'saludo',
  rol: 'bot',
  texto: 'Preguntame sobre envíos, pagos o un producto del catálogo. Para ver lo que hay, abrí Shop.',
}

/**
 * Asesor IA Visitante: sin SKU de maqueta.
 */
export default function VisitanteAsesorIaPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO])
  const [draft, setDraft] = useState('')

  function enviar() {
    const limpio = draft.trim()
    if (!limpio) return
    setMensajes((prev) => [
      ...prev,
      { id: `u-${prev.length}`, rol: 'user', texto: limpio },
      { id: `b-${prev.length}`, rol: 'bot', texto: 'Revisá Shop para ver el catálogo real. Ahí también está el asistente de productos.' },
    ])
    setDraft('')
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-hc-surface">
      <header className="flex items-center gap-2.5 border-b border-hc-border px-5 pb-4 pt-6">
        <Link to={visitanteRuta('shop')} aria-label="Volver" className="flex size-11 items-center justify-center">
          <IconoVolver className="size-5" />
        </Link>
        <div>
          <p className="text-sm font-bold">Asesor IA HotClick</p>
          <p className="text-[10px] text-hc-muted">Catálogo y envíos</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {mensajes.map((msg) => (
          <div key={msg.id} className={`flex ${msg.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p
              className={`max-w-[280px] rounded-[14px] px-3.5 py-3 text-[13px] ${
                msg.rol === 'user' ? 'bg-hc-accent text-white' : 'bg-[var(--hc-n-100)] text-hc-text'
              }`}
            >
              {msg.texto}
            </p>
          </div>
        ))}
      </div>
      <form
        className="flex items-center gap-2.5 border-t border-hc-border px-5 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          enviar()
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribí tu pregunta..."
          className="min-h-11 flex-1 rounded-full bg-[var(--hc-n-100)] px-3.5 text-[13px] outline-none placeholder:text-hc-muted"
        />
        <button type="submit" aria-label="Enviar" className="flex size-10 items-center justify-center rounded-full bg-hc-accent text-white">
          <IconoEnviar className="size-4" />
        </button>
      </form>
    </div>
  )
}
