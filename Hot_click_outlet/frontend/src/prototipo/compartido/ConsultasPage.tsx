import { Link } from 'react-router-dom'
import { useSellerRuta } from './SellerPlanContext'
import EntradaPagina from './motion/EntradaPagina'
import EstadoVacioConversacional from './motion/EstadoVacioConversacional'

/**
 * Consultas con Hot (Figma 61:514). Sin API de conversaciones: solo el vacío aprobado.
 */
export default function ConsultasPage() {
  const ruta = useSellerRuta()
  return (
    <EntradaPagina className="flex min-h-dvh flex-col">
      <main className="flex min-h-dvh flex-col">
        <header className="flex items-center gap-3 border-b border-hc-border px-5 pb-3 pt-14">
          <Link to={ruta('opciones')} className="text-xl font-bold max-md:hidden" aria-label="Volver">←</Link>
          <div className="flex size-9 items-center justify-center rounded-full bg-hc-primary text-sm font-bold text-white">H</div>
          <div>
            <p className="font-semibold">Asistente Hot</p>
            <p className="text-[11px] text-hc-muted">Inventario · Finanzas · Soporte</p>
          </div>
        </header>
        <div className="flex-1 px-5 py-4">
          <EstadoVacioConversacional
            // TODO copy Producto
            titulo="Todavía no tenés consultas"
            // TODO copy Producto
            mensaje="Tus conversaciones con Hot van a aparecer acá."
          />
        </div>
      </main>
    </EntradaPagina>
  )
}
