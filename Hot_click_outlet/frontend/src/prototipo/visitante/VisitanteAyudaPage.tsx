import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconoMas, IconoMenos } from './VisitanteIcons'
import VisitanteMain, { VisitanteBackHeader, VisitanteBoton } from './VisitantePiezas'
import { FAQ_VISITANTE, visitanteRuta, WHATSAPP_HOTCLICK } from './visitanteMock'

/**
 * Ayuda y soporte Visitante (Figma 155:342).
 */
export default function VisitanteAyudaPage() {
  const [abierta, setAbierta] = useState<string | null>(null)
  return (
    <VisitanteMain conNav={false}>
      <VisitanteBackHeader titulo="Ayuda y Soporte" to={visitanteRuta('cuenta')} />
      <ul className="mb-6">
        {FAQ_VISITANTE.map((faq) => {
          const open = abierta === faq.id
          return (
            <li key={faq.id} className="border-b border-hc-border">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between py-4 text-left"
                onClick={() => setAbierta(open ? null : faq.id)}
                aria-expanded={open}
              >
                <span className="pr-3 text-[13px] font-medium">{faq.pregunta}</span>
                {open ? <IconoMenos className="size-4 text-hc-muted" /> : <IconoMas className="size-4 text-hc-muted" />}
              </button>
              {open ? <p className="pb-4 text-xs text-hc-muted">{faq.respuesta}</p> : null}
            </li>
          )
        })}
      </ul>
      <VisitanteBoton href={`https://wa.me/${WHATSAPP_HOTCLICK}`} className="text-sm">
        Escribinos por WhatsApp
      </VisitanteBoton>
      <nav className="mt-8 space-y-3 text-sm" aria-label="Páginas legales">
        <p className="font-semibold">Más información</p>
        <Link to="/envios" className="block min-h-11 font-medium text-hc-accent">Envíos</Link>
        <Link to="/nosotros" className="block min-h-11 font-medium text-hc-accent">Nosotros</Link>
        <Link to="/terminos" className="block min-h-11 font-medium text-hc-accent">Términos</Link>
        <Link to="/privacidad" className="block min-h-11 font-medium text-hc-accent">Privacidad</Link>
        <Link to="/devoluciones" className="block min-h-11 font-medium text-hc-accent">Devoluciones</Link>
      </nav>
    </VisitanteMain>
  )
}
