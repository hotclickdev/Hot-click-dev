import { ChevronLeftIcon, ClockIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import { RUTA_EMPRENDEDOR } from '../constants'

/**
 * Paso 10 Próximamente (Figma 33:138). El mock usaba emoji de reloj; acá hay ícono SVG.
 */
export default function ProximamentePage() {
  return (
    <EntradaPagina>
      <main className="flex min-h-dvh flex-col items-center gap-[18px] px-5 pt-8 text-center">
        <div className="w-full">
          <Link to={`${RUTA_EMPRENDEDOR}/opciones`} className="flex size-11 items-center" aria-label="Volver">
            <ChevronLeftIcon className="size-5" />
          </Link>
        </div>
        <div className="mt-16 flex size-[72px] items-center justify-center rounded-full bg-[var(--hc-danger-bg)]">
          <ClockIcon className="size-8 text-hc-primary" />
        </div>
        <h1 className="font-display text-lg font-bold">Próximamente</h1>
        <p className="text-[13px] text-hc-muted">
          Esta función está en desarrollo. Muy pronto vas a poder usarla desde acá.
        </p>
      </main>
    </EntradaPagina>
  )
}
