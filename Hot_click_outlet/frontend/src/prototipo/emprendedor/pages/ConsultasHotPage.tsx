import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import { HotClickMark } from '@/components/ui/BrandLogo'
import { RUTA_EMPRENDEDOR } from '../constants'

const CHIPS = ['Inventario', 'Finanzas', 'Características', 'Mejoras', 'Problemas'] as const

const CONVERSACION = [
  { de: 'bot' as const, texto: '¡Hola! Soy el asistente de HotClick. Puedo ayudarte con inventario, finanzas, características, mejoras o problemas de tu tienda. ¿Qué necesitás?' },
  { de: 'user' as const, texto: '¿Cuántos productos me quedan por agotarse?' },
  { de: 'bot' as const, texto: 'Tenés 4 productos por agotarse: Auriculares Bluetooth X200, Cargador USB-C 30W y 2 más. ¿Querés que te arme la lista completa?' },
  { de: 'user' as const, texto: 'Sí, y decime cómo van mis ganancias este mes' },
  { de: 'bot' as const, texto: 'Este mes vendiste ₡145.000 y tenés ₡320.000 en ganancia potencial de productos publicados. Tu producto más vendido es Auriculares Bluetooth X200.' },
]

/**
 * Paso 9 Consultas con Hot (Figma 30:128). Conversación del mock; no llama al copilot.
 */
export default function ConsultasHotPage() {
  const [texto, setTexto] = useState('')
  const [mensajes, setMensajes] = useState(CONVERSACION)

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="border-b border-hc-border px-5 pb-4 pt-8">
        <div className="flex items-center gap-2.5">
          <Link to={`${RUTA_EMPRENDEDOR}/opciones`} className="flex size-11 shrink-0 items-center justify-center" aria-label="Volver">
            <ChevronLeftIcon className="size-5" />
          </Link>
          <div className="flex size-[38px] items-center justify-center rounded-full bg-hc-surface">
            <HotClickMark className="" size={24} />
          </div>
          <div>
            <p className="text-[15px] font-bold">Asistente Hot</p>
            <p className="text-[10px] text-hc-muted">Inventario · Finanzas · Soporte</p>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-[18px]">
        <div className="flex gap-2 overflow-x-auto">
          {CHIPS.map((chip) => (
            <span key={chip} className="shrink-0 rounded-full border border-hc-border px-3 py-1.5 text-[11px] font-medium">
              {chip}
            </span>
          ))}
        </div>
        {mensajes.map((msg, i) => (
          <Burbuja key={`${msg.de}-${i}`} de={msg.de} texto={msg.texto} />
        ))}
      </div>
      <form
        className="flex items-center gap-2.5 border-t border-hc-border px-5 py-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          if (!texto.trim()) return
          setMensajes((prev) => [
            ...prev,
            { de: 'user', texto: texto.trim() },
            { de: 'bot', texto: 'En el prototipo esta conversación es de Figma. El copilot de admin vive en /admin/copilot.' },
          ])
          setTexto('')
        }}
      >
        <input
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="Escribí tu consulta..."
          className="min-h-11 flex-1 rounded-full bg-[var(--hc-n-50)] px-3.5 py-3 text-[13px] outline-none"
        />
        <button type="submit" className="flex size-10 items-center justify-center rounded-full bg-hc-primary text-white" aria-label="Enviar">
          <PaperAirplaneIcon className="size-4" />
        </button>
      </form>
    </main>
  )
}

function Burbuja({ de, texto }: { de: 'bot' | 'user'; texto: string }) {
  const propia = de === 'user'
  return (
    <div className={`flex ${propia ? 'justify-end' : 'justify-start'}`}>
      <p
        className={`max-w-[280px] rounded-[14px] px-3.5 py-3 text-[13px] ${
          propia ? 'bg-hc-primary text-white' : 'bg-[var(--hc-n-100)] text-hc-text'
        }`}
      >
        {texto}
      </p>
    </div>
  )
}
