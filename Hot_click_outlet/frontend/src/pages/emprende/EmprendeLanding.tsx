import EmprendeHero from './EmprendeHero'
import EmprendeProceso from './EmprendeProceso'
import EmprendeFormulario from './EmprendeFormulario'
import EmprendeBeneficios from './EmprendeBeneficios'
import EmprendePlanes from './EmprendePlanes'
import EmprendeFaq from './EmprendeFaq'
import EmprendeAcciones from './EmprendeAcciones'

/** Landing completa para visitantes en /emprende. */
export default function EmprendeLanding() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <EmprendeHero yaEsDuenio={false} />
      <EmprendeProceso />
      <EmprendeFormulario />
      <EmprendeBeneficios />
      <EmprendePlanes />
      <EmprendeFaq />
      <EmprendeAcciones yaEsDuenio={false} />
    </div>
  )
}
