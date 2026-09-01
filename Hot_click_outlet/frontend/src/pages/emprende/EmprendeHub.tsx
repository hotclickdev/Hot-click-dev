import EmprendeHero from './EmprendeHero'
import EmprendePasos from './EmprendePasos'
import EmprendeAcciones from './EmprendeAcciones'

/** Hub corto para dueños de negocio ya logueados. */
export default function EmprendeHub() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <EmprendeHero yaEsDuenio />
      <EmprendePasos yaEsDuenio />
      <EmprendeAcciones yaEsDuenio />
    </div>
  )
}
