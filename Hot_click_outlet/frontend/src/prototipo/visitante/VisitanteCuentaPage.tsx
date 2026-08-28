import { useNavigate } from 'react-router-dom'
import VisitanteMain, { VisitanteMenuRow, VisitanteTitulo } from './VisitantePiezas'
import { visitanteRuta } from './visitanteMock'
import useAuthStore from '@/store/authStore'

const MENU = [
  { to: visitanteRuta('pedidos'), label: 'Mis pedidos' },
  { to: visitanteRuta('favoritos'), label: 'Favoritos' },
  { to: visitanteRuta('direcciones'), label: 'Direcciones de envío' },
  { to: visitanteRuta('metodos-pago'), label: 'Métodos de pago' },
  { to: '/emprende', label: 'Vender en HotClick' },
  { to: visitanteRuta('ayuda'), label: 'Ayuda y soporte' },
] as const

/**
 * Account Visitante (Figma 121:160).
 */
export default function VisitanteCuentaPage() {
  const navigate = useNavigate()
  const userName = useAuthStore((s) => s.userName) as string | null
  const userEmail = useAuthStore((s) => s.userEmail) as string | null
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated) as () => boolean
  const logout = useAuthStore((s) => s.logout) as () => void
  const nombre = userName || 'Visitante'
  const correo = userEmail || 'Iniciá sesión para ver tu cuenta'
  const inicial = nombre.slice(0, 1).toUpperCase()

  return (
    <VisitanteMain>
      <VisitanteTitulo>Mi cuenta</VisitanteTitulo>
      <div className="mb-4 flex items-center gap-3.5 rounded-[18px] bg-[var(--hc-blue-50)] p-4">
        <div className="flex size-[52px] items-center justify-center rounded-full bg-hc-accent font-display text-lg font-bold text-white">
          {inicial}
        </div>
        <div>
          <p className="text-sm font-bold">{nombre}</p>
          <p className="text-[11px] text-hc-muted">{correo}</p>
        </div>
      </div>
      {MENU.map((item) => (
        <VisitanteMenuRow key={item.to} to={item.to}>
          {item.label}
        </VisitanteMenuRow>
      ))}
      {isAuthenticated() ? (
        <VisitanteMenuRow
          peligro
          onClick={() => { logout(); navigate('/') }}
        >
          Cerrar sesión
        </VisitanteMenuRow>
      ) : (
        <VisitanteMenuRow to="/login">Iniciar sesión</VisitanteMenuRow>
      )}
    </VisitanteMain>
  )
}
