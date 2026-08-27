import VisitanteMain, { VisitanteMenuRow, VisitanteTitulo } from './VisitantePiezas'
import { visitanteRuta } from './visitanteMock'

const MENU = [
  { to: visitanteRuta('pedidos'), label: 'Mis pedidos' },
  { to: visitanteRuta('favoritos'), label: 'Favoritos' },
  { to: visitanteRuta('direcciones'), label: 'Direcciones de envío' },
  { to: visitanteRuta('metodos-pago'), label: 'Métodos de pago' },
  { to: visitanteRuta('ayuda'), label: 'Ayuda y soporte' },
] as const

/**
 * Account Visitante (Figma 121:160).
 */
export default function VisitanteCuentaPage() {
  return (
    <VisitanteMain>
      <VisitanteTitulo>Mi cuenta</VisitanteTitulo>
      <div className="mb-4 flex items-center gap-3.5 rounded-[18px] bg-[var(--hc-blue-50)] p-4">
        <div className="flex size-[52px] items-center justify-center rounded-full bg-hc-accent font-display text-lg font-bold text-white">
          A
        </div>
        <div>
          <p className="text-sm font-bold">Ana Jiménez</p>
          <p className="text-[11px] text-hc-muted">ana.j@gmail.com</p>
        </div>
      </div>
      {MENU.map((item) => (
        <VisitanteMenuRow key={item.to} to={item.to}>
          {item.label}
        </VisitanteMenuRow>
      ))}
      <VisitanteMenuRow to={visitanteRuta()} peligro>
        Cerrar sesión
      </VisitanteMenuRow>
    </VisitanteMain>
  )
}
