import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import EnlaceTodosLosPlanes from './EnlaceTodosLosPlanes'
import PymeLanding from '../pyme/PymeLanding'
import { PLAN_PRECIOS, textoComision } from '@/config/planesPrecios'
import { mensualidadMeta, notaMonedaMeta, useMensualidadesPlanes } from './useMensualidadesPlanes'

export default function PymeLandingPage() {
  const { montos, moneda } = useMensualidadesPlanes()
  const descripcion = `Plan PYME: ${mensualidadMeta(montos.PYME, moneda)} + ${textoComision(PLAN_PRECIOS.PYME.comisionPct)}, sin mínimo. Equipo, inventario y caja en un solo panel. ${notaMonedaMeta(moneda)}`
  return (
    <MainLayout>
      <Helmet>
        <title>PYME — Operá tu negocio en un panel | HotClick</title>
        <meta name="description" content={descripcion} />
      </Helmet>
      <EnlaceTodosLosPlanes />
      <PymeLanding />
    </MainLayout>
  )
}
