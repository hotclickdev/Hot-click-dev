import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import PymeLanding from '../pyme/PymeLanding'

export default function PymeLandingPage() {
  return (
    <MainLayout>
      <Helmet>
        <title>PYME — Operá tu negocio en un panel | HotClick</title>
        <meta name="description" content="Equipo, inventario y caja en un solo panel, por ₡9.900 al mes." />
      </Helmet>
      <PymeLanding />
    </MainLayout>
  )
}
