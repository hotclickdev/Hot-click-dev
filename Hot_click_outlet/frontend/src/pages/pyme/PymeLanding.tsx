import EmprendeReveal from '../emprende/EmprendeReveal'
import PymeHero from './PymeHero'
import PymeResultados from './PymeResultados'
import PymeComoFunciona from './PymeComoFunciona'
import PymeParaVos from './PymeParaVos'
import PymeConfianzaLogos from './PymeConfianzaLogos'
import PymeNegociosReales from './PymeNegociosReales'
import PymeQueIncluye from './PymeQueIncluye'
import PymeTodoEnPanel from './PymeTodoEnPanel'
import PymePagoVerificado from './PymePagoVerificado'
import PymeComoEntras from './PymeComoEntras'
import PymeComparativaPrecio from './PymeComparativaPrecio'
import PymeFaq from './PymeFaq'
import PymeCtaFinal from './PymeCtaFinal'

const SECCIONES = [
  PymeResultados,
  PymeComoFunciona,
  PymeParaVos,
  PymeConfianzaLogos,
  PymeNegociosReales,
  PymeQueIncluye,
  PymeTodoEnPanel,
  PymePagoVerificado,
  PymeComoEntras,
  PymeComparativaPrecio,
  PymeFaq,
  PymeCtaFinal,
]

/** Landing pública /para-pymes, fiel al mockup de Figma (frame "Landing — PYME"). */
export default function PymeLanding() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14 flex flex-col gap-14 sm:gap-20">
      <EmprendeReveal>
        <PymeHero />
      </EmprendeReveal>
      {SECCIONES.map((Seccion, i) => (
        <EmprendeReveal key={i}>
          <Seccion />
        </EmprendeReveal>
      ))}
    </div>
  )
}
