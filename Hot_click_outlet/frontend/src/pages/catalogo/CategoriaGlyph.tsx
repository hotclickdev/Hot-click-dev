import type { JSX } from 'react'
import CatIcon from './CatIcon'
import { claveIconoCategoria } from './categoriaIconos'

/**
 * Pinta el icono de categoría. Acepta clave actual o emoji legado;
 * en pantalla siempre es trazo SVG.
 */
export default function CategoriaGlyph({
  icono, nombre, className = 'w-4 h-4 shrink-0',
}: {
  icono?: string
  nombre?: string
  className?: string
}): JSX.Element | null {
  const clave = claveIconoCategoria(icono) ?? nombre
  if (!clave) return null
  return <CatIcon name={clave} className={className} />
}
