import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import BarraPedidos from './pedidos/BarraPedidos'
import ResumenCompra from './pedidos/detalle/ResumenCompra'
import TarjetaPaquete from './pedidos/detalle/TarjetaPaquete'
import type { CompraCliente } from './pedidos/comprasCliente'
import { useDetalleCompra } from './pedidos/useDetalleCompra'

function ContenidoCompra({ compra }: { compra: CompraCliente }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-[12px] px-[16px] pb-[20px] pt-[14px]">
      <ResumenCompra compra={compra} />
      {compra.paquetes.map((paquete) => <TarjetaPaquete key={paquete.id} compra={compra} paquete={paquete} />)}
      <p className="text-[12px] leading-[16px] text-hc-n-500">{t('misPedidos.detalle.pieAcciones')}</p>
    </div>
  )
}

/** Detalle de una compra con un bloque por paquete (Figma `29:1434`). */
export default function DetallePedidoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { cargando, compra } = useDetalleCompra(id)
  const titulo = compra ? t('misPedidos.detalle.titulo', { numero: compra.numero }) : t('misPedidos.titulo')

  return (
    <MainLayout variante="propia" barraInferior={false}>
      <div className="min-h-screen bg-hc-n-50 lg:min-h-0 lg:pb-[64px]">
        <BarraPedidos titulo={titulo} onVolver={() => navigate('/mis-pedidos')} />
        {cargando && <div className="flex justify-center py-16"><Spinner /></div>}
        {!cargando && !compra && (
          <p className="px-[16px] pt-[24px] text-center text-[13px] text-hc-n-500">{t('misPedidos.detalle.noEncontrado')}</p>
        )}
        {compra && <ContenidoCompra compra={compra} />}
      </div>
    </MainLayout>
  )
}
