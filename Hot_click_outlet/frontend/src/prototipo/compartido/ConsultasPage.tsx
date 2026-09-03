import { Link } from 'react-router-dom'
import { useSellerRuta } from './SellerPlanContext'
import EntradaPagina from './motion/EntradaPagina'

const CHIPS = ['Inventario', 'Finanzas', 'Características', 'Mejoras', 'Problemas'] as const

/**
 * Consultas con Hot (Figma 61:514).
 */
export default function ConsultasPage() {
  const ruta = useSellerRuta()
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
          <Burbuja lado="bot">Hola. Soy el asistente de HotClick. Puedo ayudarte con inventario, finanzas, características, mejoras o problemas de tu tienda. ¿Qué necesitás?</Burbuja>
          <Burbuja lado="user">¿Cuántos productos me quedan por agotarse?</Burbuja>
          <Burbuja lado="bot">Tenés 4 productos por agotarse: Auriculares Bluetooth X200, Cargador USB-C 30W y 2 más. ¿Querés que te arme la lista completa?</Burbuja>
          <Burbuja lado="user">Sí, y decime cómo van mis ganancias este mes</Burbuja>
          <Burbuja lado="bot">Este mes vendiste ₡145.000 y tenés ₡320.000 en ganancia potencial de productos publicados. Tu producto más vendido es Auriculares Bluetooth X200.</Burbuja>
        </div>
        <form className="flex items-center gap-2 border-t border-hc-border px-5 py-3" onSubmit={(evento) => evento.preventDefault()}>
          <input className="min-h-11 flex-1 rounded-xl bg-hc-surface-2 px-3.5 text-sm" placeholder="Escribí tu consulta..." />
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
