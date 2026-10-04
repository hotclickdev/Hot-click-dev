import { useTranslation } from 'react-i18next'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { IconoPaquete } from '@/components/comprador/estados/iconosEstado'
import { FONDO_BLANCO_VACIO } from '../perfil/cuenta/cuentaEstilos'

/** Sin pedidos: Figma `45:1848`. */
export default function PedidosEmptyState({ onVerProductos }: { onVerProductos: () => void }) {
  const { t } = useTranslation()
  return (
    <div className={FONDO_BLANCO_VACIO}>
      <EstadoVacio
        espaciado="cuenta"
        icono={<IconoPaquete />}
        titulo={t('misPedidos.vacio.titulo')}
        texto={t('misPedidos.vacio.texto')}
        accion={{ texto: t('misPedidos.vacio.accion'), onClick: onVerProductos }}
      >
        <div className="flex flex-col gap-1 rounded-[12px] bg-hc-n-50 px-[14px] py-3 text-left">
          <p className="text-[13px] font-semibold leading-[normal] text-hc-n-900">{t('misPedidos.vacio.invitadoTitulo')}</p>
          <p className="text-[12px] leading-[17px] text-hc-n-600">{t('misPedidos.vacio.invitadoTexto')}</p>
        </div>
      </EstadoVacio>
    </div>
  )
}
