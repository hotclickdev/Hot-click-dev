import { useNavigate } from 'react-router-dom'
import FilaOpcion from '../ui/FilaOpcion'
import { RUTA_EMPRENDEDOR } from '../constants'
import useAuthStore from '@/store/authStore'
import MmGuiaToggle from '@/prototipo/compartido/MmGuiaToggle'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import { ListaStagger, ItemListaStagger } from '@/prototipo/compartido/motion/ListaStagger'

const OPCIONES = [
  { to: '/opciones/perfil', etiqueta: 'Editar perfil' },
  { to: '/opciones/notificaciones', etiqueta: 'Notificaciones' },
  { to: '/opciones/cobro', etiqueta: 'Métodos de cobro' },
  { to: '/opciones/ayuda', etiqueta: 'Ayuda y soporte' },
  { to: '/opciones/consultas', etiqueta: 'Consultas con Hot' },
  { to: '/opciones/bodegas', etiqueta: 'Mis bodegas' },
  { to: '/recoleccion', etiqueta: 'Recolección y entrega' },
  { to: '/opciones/negocio', etiqueta: 'Datos de tu negocio', dataMm: 'seller-opciones-negocio' },
  { to: '/opciones/plan', etiqueta: 'Tu plan' },
] as const

/**
 * Paso 7 Opciones (Figma 20:2).
 */
export default function OpcionesPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const userName = useAuthStore((s) => s.userName) ?? 'Tu cuenta'

  function cerrarSesion() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="flex flex-col gap-[22px] px-5 pt-8 md:max-w-[760px] md:px-16 md:py-12">
      <EntradaPagina className="flex flex-col gap-[22px]">
        <header>
          <h1 className="font-display text-[22px] font-bold md:text-[28px]">Opciones</h1>
          <p className="text-xs text-hc-muted">Configuración de tu cuenta</p>
        </header>
        <div className="flex items-center gap-3 rounded-[14px] bg-[var(--hc-n-50)] p-3.5">
          <div className="flex size-11 items-center justify-center rounded-full bg-hc-primary text-base font-bold text-white">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-[11px] text-hc-muted">Plan · Emprendedor</p>
          </div>
        </div>
        <MmGuiaToggle />
        <ListaStagger className="mt-2">
          {OPCIONES.map((item) => (
            <ItemListaStagger key={item.to}>
              <FilaOpcion
                to={`${RUTA_EMPRENDEDOR}${item.to}`}
                etiqueta={item.etiqueta}
                dataMm={'dataMm' in item ? item.dataMm : undefined}
              />
            </ItemListaStagger>
          ))}
          <ItemListaStagger>
            <FilaOpcion etiqueta="Cerrar sesión" peligro onClick={cerrarSesion} />
          </ItemListaStagger>
        </ListaStagger>
      </EntradaPagina>
    </main>
  )
}
