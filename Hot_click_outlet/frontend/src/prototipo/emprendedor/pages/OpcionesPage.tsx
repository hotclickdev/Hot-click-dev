import { useNavigate } from 'react-router-dom'
import FilaOpcion from '../ui/FilaOpcion'
import { CUENTA_DEMO, RUTA_EMPRENDEDOR } from '../constants'

const OPCIONES = [
  { to: '/opciones/perfil', etiqueta: 'Editar perfil' },
  { to: '/opciones/notificaciones', etiqueta: 'Notificaciones' },
  { to: '/opciones/cobro', etiqueta: 'Métodos de cobro' },
  { to: '/opciones/ayuda', etiqueta: 'Ayuda y soporte' },
  { to: '/opciones/consultas', etiqueta: 'Consultas con Hot' },
  { to: '/opciones/bodegas', etiqueta: 'Mis bodegas' },
  { to: '/opciones/negocio', etiqueta: 'Datos de tu negocio' },
  { to: '/opciones/plan', etiqueta: 'Tu plan' },
] as const

/**
 * Paso 7 Opciones (Figma 20:2).
 */
export default function OpcionesPage() {
  const navigate = useNavigate()
  return (
    <main className="flex flex-col gap-[22px] px-5 pt-8">
      <header>
        <h1 className="font-display text-[22px] font-bold">Opciones</h1>
        <p className="text-xs text-hc-muted">Configuración de tu cuenta</p>
      </header>
      <div className="flex items-center gap-3 rounded-[14px] bg-[var(--hc-n-50)] p-3.5">
        <div className="flex size-11 items-center justify-center rounded-full bg-hc-primary text-base font-bold text-white">
          Q
        </div>
        <div>
          <p className="text-sm font-medium">{CUENTA_DEMO.usuario}</p>
          <p className="text-[11px] text-hc-muted">Plan Emprendedor</p>
        </div>
      </div>
      <nav className="mt-6">
        {OPCIONES.map((item) => (
          <FilaOpcion key={item.to} to={`${RUTA_EMPRENDEDOR}${item.to}`} etiqueta={item.etiqueta} />
        ))}
        <FilaOpcion etiqueta="Cerrar sesión" peligro onClick={() => navigate(`${RUTA_EMPRENDEDOR}/login`)} />
      </nav>
    </main>
  )
}
