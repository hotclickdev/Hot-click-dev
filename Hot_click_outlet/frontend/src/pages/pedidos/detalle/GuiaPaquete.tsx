import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_PEDIDOS } from '../iconosPedidos'
import { esGuiaDeCorreos, urlSeguimiento } from '../paquetePedido'
import { lineaGuia, textoSinGuia } from '../textosPedido'
import type { PedidoCliente } from '../pedidoHelpers'

/** Caja de guía del paquete: con número y «Seguir» (Figma `37:1395`) o pendiente (`37:1438`). */
export default function GuiaPaquete({ paquete }: { paquete: PedidoCliente }) {
  const { t, i18n } = useTranslation()
  const url = urlSeguimiento(paquete)

  if (!paquete.numeroGuia || !url) {
    return (
      <p className="rounded-[10px] bg-hc-n-50 px-[12px] py-[10px] text-[12px] leading-[16px] text-hc-n-600">
        {textoSinGuia(t, paquete)}
      </p>
    )
  }

  const linea = lineaGuia(t, paquete, i18n.language)
  return (
    <div className="flex flex-col gap-[4px] rounded-[10px] bg-hc-n-50 px-[12px] py-[10px]">
      <div className="flex items-center justify-between gap-[8px]">
        <div className="flex min-w-0 flex-col gap-px">
          <span className="text-[11px] leading-[13px] text-hc-n-600">
            {t(esGuiaDeCorreos(paquete) ? 'misPedidos.paquete.guiaCorreos' : 'misPedidos.paquete.guiaExpress')}
          </span>
          <span className="truncate font-mono text-[14px] font-medium leading-[18px] text-hc-n-900">{paquete.numeroGuia}</span>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-[4px] text-[13px] font-semibold leading-[15px] text-hc-blue-600">
          {t('misPedidos.paquete.seguir')}
          <IconoFigma src={ICONOS_PEDIDOS.externo} size={14} />
        </a>
      </div>
      {linea && <span className="text-[12px] leading-[14px] text-hc-n-600">{linea}</span>}
    </div>
  )
}
