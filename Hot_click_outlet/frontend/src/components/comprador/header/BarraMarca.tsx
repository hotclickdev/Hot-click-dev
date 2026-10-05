import ThemeToggle from '@/components/ui/ThemeToggle'
import MarcaComprador from './MarcaComprador'

type BarraMarcaProps = {
  centrada?: boolean
}

/** Barra móvil con solo el logo: 404 (`45:2198`, a la izquierda) y pago exitoso (`29:1932`, centrada). */
export default function BarraMarca({ centrada = false }: BarraMarcaProps) {
  return (
    <div className={`relative flex items-center border-b border-hc-n-200 bg-hc-n-0 px-4 leading-[normal] lg:hidden ${centrada ? 'justify-center py-[14px]' : 'justify-between py-3'}`}>
      <MarcaComprador tamano={centrada ? 'centrada' : 'pequena'} />
      <ThemeToggle className={`min-h-11 min-w-11 ${centrada ? 'absolute right-2' : ''}`} />
    </div>
  )
}
