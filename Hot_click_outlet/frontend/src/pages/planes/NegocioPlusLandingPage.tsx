import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import EnlaceTodosLosPlanes from './EnlaceTodosLosPlanes'
import NegocioPlusLanding from '../negocioplus/NegocioPlusLanding'
import { PLAN_PRECIOS, textoComision } from '@/config/planesPrecios'
import { mensualidadMeta, useMensualidadesPlanes } from './useMensualidadesPlanes'

export default function NegocioPlusLandingPage() {
  const montos = useMensualidadesPlanes()
  const descripcion = `Plan Negocio Plus: ${mensualidadMeta(montos.NEGOCIO_PLUS)} + ${textoComision(PLAN_PRECIOS.NEGOCIO_PLUS.comisionPct)}, sin mínimo. Pedidos por local, equipo sin tope y CRM de clientes. Productos en colones; mensualidad en dólares.`
  return (
    <MainLayout>
      <Helmet>
        <title>Negocio Plus — Todas tus sucursales en un panel | HotClick</title>
        <meta name="description" content={descripcion} />
      </Helmet>
      <EnlaceTodosLosPlanes />
      <NegocioPlusLanding />
    </MainLayout>
  )
}
