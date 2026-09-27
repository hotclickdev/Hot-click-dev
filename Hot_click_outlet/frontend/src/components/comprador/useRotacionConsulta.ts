import { useEffect, useState } from 'react'
import { INTERVALO_ROTACION_MS, SALIDA_PREGUNTA_MS, siguienteIndice } from './consultaRotativaHelpers'

/**
 * Índice de la pregunta visible. Mientras `activa` sea falso (campo enfocado
 * o con texto) la rotación queda detenida.
 */
export function useRotacionConsulta(total: number, activa: boolean) {
  const [indice, setIndice] = useState(0)
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    if (!activa || total <= 1) return undefined
    let salida: ReturnType<typeof setTimeout> | undefined
    const intervalo = setInterval(() => {
      setSaliendo(true)
      salida = setTimeout(() => {
        setIndice((actual) => siguienteIndice(actual, total))
        setSaliendo(false)
      }, SALIDA_PREGUNTA_MS)
    }, INTERVALO_ROTACION_MS)
    return () => {
      clearInterval(intervalo)
      if (salida) clearTimeout(salida)
      setSaliendo(false)
    }
  }, [activa, total])

  return { indice, saliendo }
}
