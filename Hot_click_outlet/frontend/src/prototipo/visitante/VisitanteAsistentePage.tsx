import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconoChispa, IconoEnviar, IconoVolver } from './VisitanteIcons'
import { CHIPS_ASISTENTE, visitanteRuta } from './visitanteMock'
import { VisitanteChip } from './VisitantePiezas'

type Mensaje = { id: string; rol: 'bot' | 'user'; texto: string }

const INICIAL: Mensaje[] = [
  {
    id: '1',
    rol: 'bot',
    texto: '¡Hola! Soy el asistente de HotClick. Puedo ayudarte a encontrar justo lo que buscás para tu hogar.',
  },
  { id: '2', rol: 'user', texto: '¿Accesorios para hacer tu hogar más cómodo?' },
  {
    id: '3',
    rol: 'bot',
    texto:
      'Mirá esto: cojines y almohadones desde ₡6.500, con envío a todo el país. ¿Querés que te muestre las mejores opciones?',
  },
]

/**
 * Asistente HotClick Visitante (Figma 116:128).
 */
export default function VisitanteAsistentePage() {
  const [mensajes, setMensajes] = useState(INICIAL)
  const [draft, setDraft] = useState('')

  function enviar(texto: string) {
    const limpio = texto.trim()
    if (!limpio) return
    setMensajes((prev) => [
      ...prev,
      { id: `u-${prev.length}`, rol: 'user', texto: limpio },
      {
        id: `b-${prev.length}`,
        rol: 'bot',
        texto: 'Te muestro opciones de esa área. Abrí Shop para ver el catálogo completo.',
      },
    ])
    setDraft('')
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-hc-surface">
      <header className="flex items-center gap-2.5 border-b border-hc-border px-5 pb-4 pt-6">
        <Link to={visitanteRuta()} aria-label="Volver" className="flex size-11 items-center justify-center">
          <IconoVolver className="size-5" />
        </Link>
        <div className="flex size-[38px] items-center justify-center rounded-full bg-hc-accent text-white">
          <IconoChispa className="size-4" />
        </div>
        <div>
          <p className="text-[15px] font-bold">Asistente HotClick</p>
          <p className="text-[10px] text-hc-muted">Preguntame sobre cualquier área del hogar</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-4">
        <div className="flex gap-2 overflow-x-auto">
          {CHIPS_ASISTENTE.map((chip) => (
            <VisitanteChip key={chip} onClick={() => enviar(chip)}>
              {chip}
            </VisitanteChip>
          ))}
        </div>
        {mensajes.map((msg) => (
          <Burbuja key={msg.id} rol={msg.rol} texto={msg.texto} />
        ))}
      </div>
      <form
        className="flex items-center gap-2.5 border-t border-hc-border px-5 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          enviar(draft)
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribí qué buscás..."
          className="min-h-11 flex-1 rounded-full bg-[var(--hc-n-100)] px-3.5 text-[13px] outline-none placeholder:text-hc-muted"
        />
        <button type="submit" aria-label="Enviar" className="flex size-10 items-center justify-center rounded-full bg-hc-accent text-white">
          <IconoEnviar className="size-4" />
        </button>
      </form>
    </div>
  )
}

function Burbuja({ rol, texto }: { rol: 'bot' | 'user'; texto: string }) {
  const propia = rol === 'user'
  return (
    <div className={`flex ${propia ? 'justify-end' : 'justify-start'}`}>
      <p
        className={`max-w-[280px] rounded-[14px] px-3.5 py-3 text-[13px] ${
          propia ? 'bg-hc-accent text-white' : 'bg-[var(--hc-n-100)] text-hc-text'
        }`}
      >
        {texto}
      </p>
    </div>
  )
}
