/**
 * Anfitrión de la vitrina: el nombre puede recortarse; "en HotClick" no.
 */
export default function TiendaAnfitrion({ nombre, className = '' }: { nombre: string; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 max-w-full items-baseline ${className}`}>
      <span className="truncate">Tienda de {nombre}</span>
      <span className="shrink-0 whitespace-nowrap"> en HotClick</span>
    </span>
  )
}
