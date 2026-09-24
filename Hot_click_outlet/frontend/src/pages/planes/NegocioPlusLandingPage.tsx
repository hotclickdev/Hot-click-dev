import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import PlanLandingLayout from './PlanLandingLayout'

export default function NegocioPlusLandingPage() {
  return (
    <MainLayout>
      <Helmet>
        <title>Negocio Plus — Todas tus sucursales en un panel | HotClick</title>
        <meta name="description" content="Pedidos por local, equipo sin tope y CRM de clientes, por ₡24.900 al mes." />
      </Helmet>
      <PlanLandingLayout planId="plus" />
    </MainLayout>
  )
}
