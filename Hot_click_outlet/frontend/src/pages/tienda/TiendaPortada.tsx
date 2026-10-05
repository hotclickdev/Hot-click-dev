import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_TIENDA } from './iconosTienda'
import { useCompartirTienda } from './useCompartirTienda'

const CLASE_BOTON = 'absolute top-4 flex size-10 items-center justify-center rounded-full bg-[var(--t-surface)] text-hc-n-900 md:hidden'

/**
 * Portada del perfil (Figma `29:923`, 150 de alto en móvil; `29:2355`, 220 en escritorio).
 * Es del color secundario de la tienda. El atrás vive en la barra de HotClick; aquí queda Compartir.
 */
export default function TiendaPortada({ nombre }: { nombre: string }) {
  const compartir = useCompartirTienda(nombre)

  return (
    <div className="relative h-[150px] w-full overflow-hidden lg:h-[220px]" style={{ backgroundColor: 'var(--t-secondary)' }}>
      <button type="button" onClick={compartir} aria-label={`Compartir ${nombre}`} className={`${CLASE_BOTON} right-4`}>
        <IconoFigma src={ICONOS_TIENDA.portadaCompartir} size={19} />
      </button>
    </div>
  )
}
