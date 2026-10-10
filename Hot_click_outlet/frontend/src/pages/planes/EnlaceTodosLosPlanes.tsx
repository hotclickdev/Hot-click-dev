import { Link } from 'react-router-dom'

/** Vuelta a la comparación de los 3 planes desde el detalle de cada uno (enlace, no compite con la CTA roja). */
export default function EnlaceTodosLosPlanes() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-4 sm:px-6">
      <Link to="/planes" className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-hc-blue-600">
        ← Ver y comparar todos los planes
      </Link>
    </div>
  )
}
