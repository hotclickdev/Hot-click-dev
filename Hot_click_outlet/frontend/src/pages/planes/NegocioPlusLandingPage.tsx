import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import EnlaceTodosLosPlanes from './EnlaceTodosLosPlanes'
import NegocioPlusLanding from '../negocioplus/NegocioPlusLanding'
import { PLAN_PRECIOS, textoComision } from '@/config/planesPrecios'
import { mensualidadMeta, notaMonedaMeta, useMensualidadesPlanes } from './useMensualidadesPlanes'

export default function NegocioPlusLandingPage() {
  const { montos, moneda } = useMensualidadesPlanes()
  const descripcion = `Plan Negocio Plus: ${mensualidadMeta(montos.NEGOCIO_PLUS, moneda)} + ${textoComision(PLAN_PRECIOS.NEGOCIO_PLUS.comisionPct)}, sin mínimo. Pedidos por local, equipo sin tope y CRM de clientes. ${notaMonedaMeta(moneda)}`
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
