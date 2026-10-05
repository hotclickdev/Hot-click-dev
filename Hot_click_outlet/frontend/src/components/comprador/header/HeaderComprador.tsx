import { useEffect, useState, type ReactNode } from 'react'
import BarraInterna from './BarraInterna'
import BarraMarca from './BarraMarca'
import HeaderEscritorio from './HeaderEscritorio'
import HeaderEscritorioCompacto from './HeaderEscritorioCompacto'
import HeaderEscritorioMinimo from './HeaderEscritorioMinimo'
import HeaderMovil from './HeaderMovil'
import type { DatosBarraInterna, EncabezadoEscritorio, EncabezadoMovil } from './tiposHeader'

type HeaderCompradorProps = {
  onBuscarConFoto: () => void
  /** Cromo móvil. Por defecto `global` (el Home). */
  movil?: EncabezadoMovil
  /** Header desktop. Por defecto `completo`. */
  escritorio?: EncabezadoEscritorio
  /** Datos de la barra cuando `movil` es `interno`. */
  barraInterna?: DatosBarraInterna
  /** Centra el logo cuando `movil` es `marca`. */
  marcaCentrada?: boolean
  /** Fila de migas y flechas, pegada al encabezado. */
  children?: ReactNode
}

/** Figma `12:809` / `12:551`: al scrollear el header gana una sombra suave. */
function useScrolleado(): boolean {
  const [scrolleado, setScrolleado] = useState(false)
  useEffect(() => {
    const actualizar = () => setScrolleado(window.scrollY > 0)
    actualizar()
    window.addEventListener('scroll', actualizar, { passive: true })
    return () => window.removeEventListener('scroll', actualizar)
  }, [])
  return scrolleado
}

function CromoMovil({ movil, onBuscarConFoto, barraInterna, marcaCentrada }: Required<Pick<HeaderCompradorProps, 'movil'>> & Omit<HeaderCompradorProps, 'movil' | 'escritorio'>) {
  if (movil === 'interno' && barraInterna) return <BarraInterna {...barraInterna} />
  if (movil === 'marca') return <BarraMarca centrada={marcaCentrada} />
  if (movil === 'global') return <HeaderMovil onBuscarConFoto={onBuscarConFoto} />
  return null
}

function CromoEscritorio({ escritorio, onBuscarConFoto }: { escritorio: EncabezadoEscritorio; onBuscarConFoto: () => void }) {
  if (escritorio === 'compacto') return <HeaderEscritorioCompacto />
  if (escritorio === 'carrito') return <HeaderEscritorioCompacto filaCarrito />
  if (escritorio === 'minimo') return <HeaderEscritorioMinimo />
  return <HeaderEscritorio onBuscarConFoto={onBuscarConFoto} />
}

/**
 * Header fijo de la tienda. El cromo móvil y el de desktop se eligen por separado porque en Figma
 * una misma pantalla puede usar, por ejemplo, barra interna en móvil y header completo en desktop
 * (ficha de producto `28:839` / `29:2072`).
 */
export default function HeaderComprador({
  onBuscarConFoto,
  movil = 'global',
  escritorio = 'completo',
  barraInterna,
  marcaCentrada,
  children,
}: HeaderCompradorProps) {
  const scrolleado = useScrolleado()
  return (
    <header
      className={`sticky top-0 z-50 transition-shadow ${scrolleado ? 'shadow-[0px_4px_12px_0px_rgba(20,23,28,0.1)]' : ''}`}
    >
      <CromoMovil movil={movil} onBuscarConFoto={onBuscarConFoto} barraInterna={barraInterna} marcaCentrada={marcaCentrada} />
      <CromoEscritorio escritorio={escritorio} onBuscarConFoto={onBuscarConFoto} />
      {children}
    </header>
  )
}
