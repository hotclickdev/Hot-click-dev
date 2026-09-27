import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import EstadoVacioConversacional from '@/prototipo/compartido/motion/EstadoVacioConversacional'
import { RUTA_EMPRENDEDOR } from '../constants'
import { etapaDespacho } from './despacho/despachoPaquete'
import TarjetaEnviarA from './despacho/TarjetaEnviarA'
import TarjetaGuia from './despacho/TarjetaGuia'
import TarjetaPagoPaquete from './despacho/TarjetaPagoPaquete'
import TarjetaSubpedido from './despacho/TarjetaSubpedido'
import { useDespachoPaquete } from './despacho/useDespachoPaquete'

const RUTA_PEDIDOS = `${RUTA_EMPRENDEDOR}/pedidos`

function MarcoDespacho({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="min-h-dvh w-full bg-hc-n-50">
      <header className="border-b border-hc-n-200 bg-hc-n-0 px-[16px] py-[14px]">
        <div className="mx-auto flex max-w-[560px] items-center gap-[12px]">
          <Link to={RUTA_PEDIDOS} aria-label="Volver a pedidos" className="flex text-hc-n-900">
            <IconoFigma src={ICONOS_COMPRA.volver} size={22} />
          </Link>
          <h1 className="flex-1 font-display text-[17px] font-bold text-hc-n-900">Despachar paquete</h1>
        </div>
      </header>
      <div className="mx-auto flex max-w-[560px] flex-col gap-[14px] px-[16px] pb-[24px] pt-[16px]">{children}</div>
    </main>
  )
}

/** Despachar paquete del vendedor (Figma `37:1780`). */
export default function DetallePedidoPage() {
  const { id = '' } = useParams()
  const { despacho, estado, despachar } = useDespachoPaquete(id)

  if (estado === 'cargando') {
    return (
      <MarcoDespacho>
        <p className="text-[13px] text-hc-n-500">Cargando paquete…</p>
      </MarcoDespacho>
    )
  }

  if (estado === 'error' || !despacho) {
    return (
      <MarcoDespacho>
        <EstadoVacioConversacional
          titulo="No pudimos cargar el paquete"
          mensaje="Puede que el enlace ya no valga. Volvé al listado de pedidos e intentá de nuevo."
        />
      </MarcoDespacho>
    )
  }

  const etapa = etapaDespacho(despacho.estado)
  return (
    <MarcoDespacho>
      <TarjetaSubpedido despacho={despacho} etapa={etapa} />
      <TarjetaEnviarA despacho={despacho} />
      {etapa === 'cancelado' ? null : (
        <TarjetaGuia despacho={despacho} despachado={etapa === 'despachado'} onDespachar={despachar} />
      )}
      <TarjetaPagoPaquete despacho={despacho} />
    </MarcoDespacho>
  )
}
