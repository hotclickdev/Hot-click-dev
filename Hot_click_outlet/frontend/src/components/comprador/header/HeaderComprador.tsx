import { useEffect, useState } from 'react'
import HeaderEscritorio from './HeaderEscritorio'
import HeaderMovil from './HeaderMovil'

type HeaderCompradorProps = {
  onBuscarConFoto: () => void
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

/** Header fijo de la tienda: versión móvil (`7:3`) bajo `lg`, desktop (`9:172`) desde `lg`. */
export default function HeaderComprador({ onBuscarConFoto }: HeaderCompradorProps) {
  const scrolleado = useScrolleado()
  return (
    <header
      className={`sticky top-0 z-50 transition-shadow ${scrolleado ? 'shadow-[0px_4px_12px_0px_rgba(20,23,28,0.1)]' : ''}`}
    >
      <HeaderMovil onBuscarConFoto={onBuscarConFoto} />
      <HeaderEscritorio onBuscarConFoto={onBuscarConFoto} />
    </header>
  )
}
