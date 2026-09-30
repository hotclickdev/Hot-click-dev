import type { ReactNode } from 'react'
import { partirCoincidencia } from '@/pages/catalogo/buscarExplorar'

/** Texto con la parte que coincide con la consulta en negrita (ignora acentos). */
export function highlight(text: string | null | undefined, query: string): ReactNode {
  if (!text || !query) return text
  const { antes, coincidencia, despues } = partirCoincidencia(text, query)
  if (!coincidencia) return text
  return (
    <>
      {antes}
      <strong className="font-semibold text-hc-n-900">{coincidencia}</strong>
      {despues}
    </>
  )
}
