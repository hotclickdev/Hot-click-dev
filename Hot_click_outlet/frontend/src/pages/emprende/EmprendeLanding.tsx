import EmprendeHero from './EmprendeHero'
import EmprendeCupoBanner from './EmprendeCupoBanner'
import EmprendeGaleria from './EmprendeGaleria'
import EmprendeFases from './EmprendeFases'
import EmprendeFormulario from './EmprendeFormulario'
import EmprendeBeneficios from './EmprendeBeneficios'
import EmprendePlanes from './EmprendePlanes'
import EmprendeFaq from './EmprendeFaq'
import EmprendeAcciones from './EmprendeAcciones'
import EmprendeReveal from './EmprendeReveal'

/** Landing completa para visitantes en /emprende. */
export default function EmprendeLanding() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <EmprendeReveal>
        <EmprendeHero yaEsDuenio={false} />
        <EmprendeCupoBanner />
      </EmprendeReveal>
      <EmprendeReveal>
        <EmprendeGaleria />
      </EmprendeReveal>
      <EmprendeReveal>
        <EmprendeFases />
      </EmprendeReveal>
      <EmprendeReveal>
        <EmprendeFormulario />
      </EmprendeReveal>
      <EmprendeReveal>
        <EmprendeBeneficios />
      </EmprendeReveal>
      <EmprendeReveal>
        <EmprendePlanes />
      </EmprendeReveal>
      <EmprendeReveal>
        <EmprendeFaq />
      </EmprendeReveal>
      <EmprendeReveal>
        <EmprendeAcciones yaEsDuenio={false} />
      </EmprendeReveal>
    </div>
  )
}
