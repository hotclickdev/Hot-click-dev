import { formatoColon } from '@/theme/formatoColon'
import { Boton, EncabezadoPagina } from '../compartido/ui'
import { useSellerRuta } from '../compartido/SellerPlanContext'

const SUCURSALES = [
  { id: 'sj', letra: 'S', nombre: 'San José Centro', ventas: 4200000, estado: 'Al día' },
  { id: 'he', letra: 'H', nombre: 'Heredia Plaza', ventas: 3100000, estado: 'Al día' },
  { id: 'ca', letra: 'C', nombre: 'Cartago Norte', ventas: 2550000, estado: 'Stock bajo' },
] as const

/**
 * Sucursales — solo Negocio Plus (Figma 62:1069).
 */
export default function SucursalesPage() {
  const ruta = useSellerRuta()
  const total = SUCURSALES.reduce((acc, item) => acc + item.ventas, 0)
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Mis Sucursales" subtitulo="Ventas e inventario consolidado de tu grupo" volverA={ruta('opciones')} />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-hc-surface-2 p-3">
          <p className="text-[11px] text-hc-muted">Sucursales</p>
          <p className="text-xl font-bold">3</p>
        </div>
        <div className="rounded-xl bg-hc-surface-2 p-3">
          <p className="text-[11px] text-hc-muted">Ventas totales</p>
          <p className="text-xl font-bold">{formatoColon(total)}</p>
        </div>
      </div>
      <Boton to={ruta('proximamente')}>+ Agregar sucursal</Boton>
      <ul className="mt-5 space-y-4">
        {SUCURSALES.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-hc-surface-2 text-sm font-bold">{item.letra}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{item.nombre}</p>
              <p className="text-xs text-hc-muted">{formatoColon(item.ventas)} este mes</p>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-[10px]"
              style={{
                background: item.estado === 'Al día' ? 'var(--hc-success-bg)' : 'var(--hc-warning-bg)',
                color: item.estado === 'Al día' ? 'var(--hc-success)' : 'var(--hc-warning)',
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
