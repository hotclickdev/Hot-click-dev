import AdminPageHeader from '@/prototipo/admin/AdminPageHeader'
import { AdminMenuRow } from '@/prototipo/admin/AdminUi'

const HERRAMIENTAS = [
  { to: '/admin/marcas', label: 'Marcas' },
  { to: '/admin/garantias', label: 'Garantías' },
  { to: '/admin/clientes', label: 'Clientes' },
  { to: '/admin/auditorias', label: 'Auditorías' },
  { to: '/admin/observabilidad', label: 'Observabilidad' },
  { to: '/admin/servicios', label: 'Servicios Hot' },
  { to: '/admin/recolecciones', label: 'Recolección y entrega' },
  { to: '/admin/aprobaciones', label: 'Aprobaciones' },
  { to: '/admin/payouts', label: 'Retiros de billetera' },
  { to: '/admin/reportes-producto', label: 'Productos reportados' },
  { to: '/admin/soporte', label: 'Inbox de soporte' },
] as const

/**
 * Más herramientas (Figma 80:228) sobre rutas reales.
 */
export default function AdminMasHerramientas() {
  return (
    <div className="mx-auto max-w-md pb-10 md:max-w-xl">
      <AdminPageHeader
        titulo="Más Herramientas"
        subtitulo="Gestión avanzada de la plataforma"
        atras="/admin"
      />
      <ul>
        {HERRAMIENTAS.map((item) => (
          <li key={item.to} className="border-t border-hc-border first:border-t-0">
            <AdminMenuRow to={item.to} label={item.label} />
          </li>
        ))}
      </ul>
    </div>
  )
}
