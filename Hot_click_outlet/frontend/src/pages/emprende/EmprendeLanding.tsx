import EmprendeHero from './EmprendeHero'
import EmprendeVitrina from './EmprendeVitrina'
import EmprendeComoFunciona from './EmprendeComoFunciona'
import EmprendeNegociosReales from './EmprendeNegociosReales'
import EmprendeParaVos from './EmprendeParaVos'
import EmprendeQueIncluye from './EmprendeQueIncluye'
import EmprendePanelPreview from './EmprendePanelPreview'
import EmprendePagoFlexible from './EmprendePagoFlexible'
import EmprendeComoEntras from './EmprendeComoEntras'
import EmprendePrecioDestacado from './EmprendePrecioDestacado'
import EmprendeFaq from './EmprendeFaq'
import EmprendeCtaFinal from './EmprendeCtaFinal'
import EmprendeReveal from './EmprendeReveal'

/** Landing completa para visitantes en /emprende (plan Emprendedor). */
export default function EmprendeLanding() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-14 sm:gap-20">
      <EmprendeHero yaEsDuenio={false} />
      <EmprendeReveal><EmprendeVitrina /></EmprendeReveal>
      <EmprendeReveal><EmprendeComoFunciona /></EmprendeReveal>
      <EmprendeReveal><EmprendeNegociosReales /></EmprendeReveal>
      <EmprendeReveal><EmprendeParaVos /></EmprendeReveal>
      <EmprendeReveal><EmprendeQueIncluye /></EmprendeReveal>
      <EmprendeReveal><EmprendePanelPreview /></EmprendeReveal>
      <EmprendeReveal><EmprendePagoFlexible /></EmprendeReveal>
      <EmprendeReveal><EmprendeComoEntras /></EmprendeReveal>
      <EmprendeReveal><EmprendePrecioDestacado /></EmprendeReveal>
      <EmprendeFaq />
      <EmprendeCtaFinal />
    </div>
  )
}
