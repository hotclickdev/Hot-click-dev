import MainLayout from '@/layouts/MainLayout'
import Seo from '@/components/seo/Seo'
import InformacionHero from './informacion/InformacionHero'
import HowToBuySection from './informacion/HowToBuySection'
import ConditionsSection from './informacion/ConditionsSection'
import ShippingOptions from './informacion/ShippingOptions'
import ReservePolicy from './informacion/ReservePolicy'
import WarrantySection from './informacion/WarrantySection'
import FaqSection from './informacion/FaqSection'
import InformacionCta from './informacion/InformacionCta'

/** Página de información: cómo comprar, envíos, garantía y FAQ. */
export default function InformacionPage() {
  return (
    <MainLayout>
      <Seo
        title="Cómo comprar, envíos y garantía — HotClick"
        description="Guía de compra en HotClick: envíos en Costa Rica, garantía de producto hasta 40 días por defectos y derecho de retracto de 7 días hábiles (Ley 7472)."
        url="https://hotclick.lat/informacion"
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-20">
        <InformacionHero />
        <HowToBuySection />
        <ConditionsSection />
        <ShippingOptions />
        <ReservePolicy />
        <WarrantySection />
        <FaqSection />
        <InformacionCta />
      </div>
    </MainLayout>
  )
}
