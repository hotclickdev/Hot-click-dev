import MarcaComprador from './MarcaComprador'

type BarraMarcaProps = {
  centrada?: boolean
}

/** Barra móvil con solo el logo: 404 (`45:2198`, a la izquierda) y pago exitoso (`29:1932`, centrada). */
export default function BarraMarca({ centrada = false }: BarraMarcaProps) {
  return (
    <div className={`flex border-b border-hc-n-200 bg-hc-n-0 px-4 py-3 leading-[normal] lg:hidden ${centrada ? 'justify-center' : ''}`}>
      <MarcaComprador tamano="pequena" />
    </div>
  )
}
