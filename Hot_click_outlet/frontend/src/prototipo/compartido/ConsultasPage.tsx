import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CONVERSACION, RESPUESTA_SIN_COPILOT } from '../emprendedor/pages/ConsultasHotPage'
import { useSellerRuta } from './SellerPlanContext'
import EntradaPagina from './motion/EntradaPagina'

const CHIPS = ['Inventario', 'Finanzas', 'Características', 'Mejoras', 'Problemas'] as const

/**
 * Consultas con Hot (Figma 61:514). S1-22 (NP-7/NP-8): sin la conversación de demo (ventas
 * de otro negocio, productos ajenos); solo el saludo, igual que el panel Emprendedor. No llama al copilot.
 */
export default function ConsultasPage() {
  const ruta = useSellerRuta()
  const [texto, setTexto] = useState('')
  const [mensajes, setMensajes] = useState(CONVERSACION)
  return (
    <EntradaPagina className="flex min-h-dvh flex-col">
      <main className="flex min-h-dvh flex-col">
        <header className="flex items-center gap-3 border-b border-hc-border px-5 pb-3 pt-14">
          <Link to={ruta('opciones')} className="text-xl font-bold" aria-label="Volver">←</Link>
          <div className="flex size-9 items-center justify-center rounded-full bg-hc-primary text-sm font-bold text-white">H</div>
          <div>
            <p className="font-semibold">Asistente Hot</p>
            <p className="text-[11px] text-hc-muted">Inventario · Finanzas · Soporte</p>
          </div>
        </header>
        <div className="flex-1 space-y-4 px-5 py-4">
          <div className="flex gap-2 overflow-x-auto">
            {CHIPS.map((chip) => (
              <span key={chip} className="shrink-0 rounded-full border border-hc-border px-3 py-1.5 text-[11px]">{chip}</span>
            ))}
          </div>
          {mensajes.map((msg, i) => (
            <Burbuja key={`${msg.de}-${i}`} lado={msg.de}>{msg.texto}</Burbuja>
          ))}
        </div>
        <form className="flex items-center gap-2 border-t border-hc-border px-5 py-3" onSubmit={(evento) => {
            evento.preventDefault()
            const consulta = texto.trim()
            if (!consulta) return
            setMensajes((prev) => [...prev, { de: 'user', texto: consulta }, { de: 'bot', texto: RESPUESTA_SIN_COPILOT }])
            setTexto('')
          }}
        >
          <input
            className="min-h-11 flex-1 rounded-xl bg-hc-surface-2 px-3.5 text-sm"
            placeholder="Escribí tu consulta..."
            aria-label="Tu consulta"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
          />
          <button type="submit" className="flex size-10 items-center justify-center rounded-full bg-hc-primary text-white" aria-label="Enviar">
            →
          </button>
        </form>
      </main>
    </EntradaPagina>
  )
}

function Burbuja({ lado, children }: { lado: 'bot' | 'user'; children: string }) {
  const alineado = lado === 'user' ? 'ml-auto bg-hc-primary text-white' : 'bg-hc-surface-2 text-hc-text'
  return <p className={`max-w-[280px] rounded-2xl px-3.5 py-3 text-sm ${alineado}`}>{children}</p>
}
