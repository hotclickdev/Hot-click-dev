import type { ReactNode } from 'react'
import { palabrasSignificativas, partirCoincidencia } from '@/pages/catalogo/buscarExplorar'

function fragmentoResaltado(texto: string, consulta: string): string {
  if (partirCoincidencia(texto, consulta).coincidencia) return consulta
  return palabrasSignificativas(consulta).find((palabra) => partirCoincidencia(texto, palabra).coincidencia) ?? consulta
}

/** Texto con la parte que coincide con la consulta en negrita (ignora acentos). */
export function highlight(text: string | null | undefined, query: string): ReactNode {
  if (!text || !query) return text
  const fragmento = fragmentoResaltado(text, query)
  const { antes, coincidencia, despues } = partirCoincidencia(text, fragmento)
  if (!coincidencia) return text
  return (
    <>
      {antes}
      <strong className="font-semibold text-hc-n-900">{coincidencia}</strong>
      {despues}
    </>
  )
}
