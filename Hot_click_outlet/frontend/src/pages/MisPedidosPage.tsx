import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import BarraInferior from '@/components/comprador/BarraInferior'
import Spinner from '@/components/ui/Spinner'
import BarraPedidos from './pedidos/BarraPedidos'
import FiltrosCompras from './pedidos/FiltrosCompras'
import SinPedidos from './pedidos/SinPedidos'
import TarjetaCompra from './pedidos/TarjetaCompra'
import { filtrarCompras, type CompraCliente, type FiltroCompras } from './pedidos/comprasCliente'
import { useComprasCliente } from './pedidos/useComprasCliente'

function ListaCompras({ compras }: { compras: CompraCliente[] }) {
  const { t } = useTranslation()
  if (compras.length === 0) {
    return <p className="px-[16px] pt-[24px] text-center text-[13px] text-hc-n-500">{t('misPedidos.sinResultados')}</p>
  }
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-[12px] px-[16px] pb-[20px] pt-[12px]">
      {compras.map((compra) => <TarjetaCompra key={compra.clave} compra={compra} />)}
    </div>
  )
}

/** «Mis pedidos» del comprador: una tarjeta por compra (Figma `28:1310`, vacío `45:1848`). */
export default function MisPedidosPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { cargando, compras } = useComprasCliente()
  const [filtro, setFiltro] = useState<FiltroCompras>('todos')
  const sinPedidos = !cargando && compras.length === 0

  return (
    <MainLayout barraMovilPropia>
      <div className={`min-h-screen pb-[88px] lg:min-h-0 lg:pb-[64px] ${sinPedidos ? 'bg-hc-n-0' : 'bg-hc-n-50'}`}>
        <BarraPedidos titulo={t('misPedidos.titulo')} onVolver={() => navigate('/perfil')} />
        {cargando && <div className="flex justify-center py-16"><Spinner /></div>}
        {sinPedidos && <SinPedidos />}
        {!cargando && !sinPedidos && (
          <>
            <FiltrosCompras activo={filtro} onCambiar={setFiltro} />
            <ListaCompras compras={filtrarCompras(compras, filtro)} />
          </>
        )}
      </div>
      <BarraInferior />
    </MainLayout>
  )
}
