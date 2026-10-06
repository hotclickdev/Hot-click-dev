import { NavLink } from 'react-router-dom'
import { RUTA_EMPRENDEDOR } from '@/utils/planPaths'
import { CAMINOS_ENCARGO, CAMINOS_PEDIDO, type CaminoVenta } from './ventaLlegada'

type Lado = 'pedidos' | 'encargos'

/**
 * Misma cabecera para Pedidos y Encargos.
 * El control sale del segmentado del manual de marca; la lista, de la tarjeta de 14px.
 */
export default function MarcoVentas({ lado }: { lado: Lado }) {
  const caminos = lado === 'pedidos' ? CAMINOS_PEDIDO : CAMINOS_ENCARGO
  const bajada = lado === 'pedidos'
    ? 'Ventas ya cobradas o por despachar.'
    : 'Pedidos a medida: hay que cotizar, cobrar o producir.'

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-display text-[22px] font-bold md:text-[28px]">Ventas</h1>
        <p className="mt-1 text-sm text-hc-muted">{bajada}</p>
      </header>
      <nav className="flex rounded-[12px] bg-hc-n-100 p-1" aria-label="Tipo de venta">
        <Pestana to={`${RUTA_EMPRENDEDOR}/pedidos`} activo={lado === 'pedidos'}>Pedidos</Pestana>
        <Pestana to={`${RUTA_EMPRENDEDOR}/encargos`} activo={lado === 'encargos'}>Encargos</Pestana>
      </nav>
      <section className="rounded-[14px] border border-hc-border bg-hc-surface p-3.5">
        <h2 className="font-display text-[15px] font-bold">Cómo llegan los datos</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {caminos.map((camino) => (
            <Camino key={camino.titulo} camino={camino} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function Pestana({ to, activo, children }: { to: string; activo: boolean; children: string }) {
  const tono = activo ? 'bg-hc-surface text-hc-blue-600' : 'text-hc-n-600'
  return (
    <NavLink
      to={to}
      className={`flex min-h-11 flex-1 items-center justify-center rounded-[10px] text-sm font-semibold ${tono}`}
      aria-current={activo ? 'page' : undefined}
    >
      {children}
    </NavLink>
  )
}

function Camino({ camino }: { camino: CaminoVenta }) {
  return (
    <li className="text-sm leading-[21px]">
      <span className="font-semibold text-hc-blue-600">{camino.titulo}. </span>
      <span className="text-hc-muted">{camino.detalle}</span>
    </li>
  )
}
