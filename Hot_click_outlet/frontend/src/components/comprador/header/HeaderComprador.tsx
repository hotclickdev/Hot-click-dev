import HeaderEscritorio from './HeaderEscritorio'
import HeaderMovil from './HeaderMovil'

type HeaderCompradorProps = {
  onBuscarConFoto: () => void
}

/** Header fijo de la tienda: versión móvil (`7:3`) bajo `lg`, desktop (`9:172`) desde `lg`. */
export default function HeaderComprador({ onBuscarConFoto }: HeaderCompradorProps) {
  return (
    <header className="sticky top-0 z-50">
      <HeaderMovil onBuscarConFoto={onBuscarConFoto} />
      <HeaderEscritorio onBuscarConFoto={onBuscarConFoto} />
    </header>
  )
}
