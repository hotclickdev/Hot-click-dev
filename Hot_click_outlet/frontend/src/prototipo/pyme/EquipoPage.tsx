import { Boton, EncabezadoPagina } from '../compartido/ui'
import { useSellerRuta } from '../compartido/SellerPlanContext'

const MIEMBROS = [
  { id: 'carlos', letra: 'C', nombre: 'Carlos Rodríguez', rol: 'Dueño', estado: 'Activo' },
  { id: 'sofia', letra: 'S', nombre: 'Sofía Vargas', rol: 'Encargada de bodega', estado: 'Activo' },
  { id: 'luis', letra: 'L', nombre: 'Luis Méndez', rol: 'Vendedor', estado: 'Activo' },
  { id: 'diego', letra: 'D', nombre: 'Diego Salas', rol: 'Vendedor (pendiente)', estado: 'Invitado' },
] as const

/**
 * Mi Equipo — solo PLAN PYME (Figma 62:259).
 */
export default function EquipoPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Mi Equipo" subtitulo="Miembros con acceso a esta tienda" volverA={ruta('opciones')} />
      <Boton to={ruta('proximamente')}>+ Invitar miembro</Boton>
      <ul className="mt-5 space-y-4">
        {MIEMBROS.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-hc-surface-2 text-sm font-bold">{item.letra}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{item.nombre}</p>
              <p className="text-xs text-hc-muted">{item.rol}</p>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-[10px]"
              style={{
                background: item.estado === 'Activo' ? 'var(--hc-success-bg)' : 'var(--hc-warning-bg)',
                color: item.estado === 'Activo' ? 'var(--hc-success)' : 'var(--hc-warning)',
              }}
            >
              {item.estado}
            </span>
          </li>
        ))}
      </ul>
    </main>
  )
}
