import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import PlanLandingLayout from './PlanLandingLayout'

export default function EmprendedorLandingPage() {
  return (
    <MainLayout>
      <Helmet>
        <title>Emprendedor — Publicá y cobrá sin mensualidad | HotClick</title>
        <meta name="description" content="Registrá tu negocio en HotClick sin mensualidad. Solo pagás una comisión cuando vendés." />
      </Helmet>
      <PlanLandingLayout planId="emprendedor" mostrarCupo />
    </MainLayout>
  )
}
