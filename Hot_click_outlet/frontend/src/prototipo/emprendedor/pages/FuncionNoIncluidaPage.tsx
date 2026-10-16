import { ChevronLeftIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import { RUTA_EMPRENDEDOR } from '../constants'

type FuncionNoIncluidaPageProps = {
  /** Nombre visible de la función, por ejemplo «CRM» o «Sucursales». */
  funcion: string
}

/**
 * QA-NEG-016: el plan Emprendedor no incluye CRM ni sucursales (tiene_crm = false y 1 bodega en
 * hot_click_plan_tb). Si alguien escribe la dirección a mano, ve este aviso sin datos en lugar de una
 * pantalla vacía. Derivada del frame Próximamente (Figma 33:138).
 */
export default function FuncionNoIncluidaPage({ funcion }: FuncionNoIncluidaPageProps) {
  return (
    <EntradaPagina>
      <main className="flex min-h-dvh flex-col items-center gap-[18px] px-5 pt-8 text-center">
        <div className="w-full">
          <Link to={RUTA_EMPRENDEDOR} className="flex size-11 items-center" aria-label="Volver">
            <ChevronLeftIcon className="size-5" />
          </Link>
        </div>
        <div className="mt-16 flex size-[72px] items-center justify-center rounded-full bg-[var(--hc-danger-bg)]">
          <LockClosedIcon className="size-8 text-hc-primary" />
        </div>
        <h1 className="font-display text-lg font-bold">{funcion} no está en tu plan</h1>
        <p className="text-[13px] text-hc-muted">
          El plan Emprendedor no incluye {funcion}. Podés verlo en los planes Pyme y Negocio Plus.
        </p>
        <Link to={`${RUTA_EMPRENDEDOR}/opciones/plan`} className="text-[13px] font-semibold text-hc-primary underline">
          Ver planes
        </Link>
      </main>
    </EntradaPagina>
  )
}
