import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_PEDIDOS } from '../iconosPedidos'
import { accionesHabilitadas, urlWhatsApp } from '../paquetePedido'
import { mensajeWhatsApp } from '../textosPedido'
import type { CompraCliente } from '../comprasCliente'
import type { PedidoCliente } from '../pedidoHelpers'

const RUTA_GARANTIA = '/servicios'
const RUTA_OPINAR = '/perfil'

const BOTON = 'flex min-w-0 flex-1 items-center justify-center gap-[6px] rounded-[10px] border border-hc-n-200 bg-hc-n-0 px-[10px] py-[9px] text-[12px] font-semibold leading-[14px] text-hc-blue-600'

function Contenido({ icono, texto }: { icono: string; texto: string }): ReactNode {
  return (
    <>
      <IconoFigma src={icono} size={15} />
      <span className="whitespace-nowrap">{texto}</span>
    </>
  )
}

function AccionAlEntregar({ habilitada, to, icono, texto }: { habilitada: boolean; to: string; icono: string; texto: string }) {
  if (!habilitada) {
    return <span aria-disabled="true" className={`${BOTON} opacity-45`}><Contenido icono={icono} texto={texto} /></span>
  }
  return <Link to={to} className={BOTON}><Contenido icono={icono} texto={texto} /></Link>
}

/** WhatsApp, Garantía y Opinar del paquete (Figma `37:1405`). */
export default function AccionesPaquete({ compra, paquete }: { compra: CompraCliente; paquete: PedidoCliente }) {
  const { t } = useTranslation()
  const entregado = accionesHabilitadas(paquete)
  return (
    <div className="flex items-center gap-[8px]">
      <a href={urlWhatsApp(mensajeWhatsApp(t, compra, paquete))} target="_blank" rel="noopener noreferrer" className={BOTON}>
        <Contenido icono={ICONOS_PEDIDOS.whatsapp} texto={t('misPedidos.paquete.whatsapp')} />
      </a>
      <AccionAlEntregar habilitada={entregado} to={RUTA_GARANTIA} icono={ICONOS_PEDIDOS.garantia} texto={t('misPedidos.paquete.garantia')} />
      <AccionAlEntregar habilitada={entregado} to={RUTA_OPINAR} icono={ICONOS_PEDIDOS.opinar} texto={t('misPedidos.paquete.opinar')} />
    </div>
  )
}
