import { useEffect, useState } from 'react'
import { emprendeCupoService, type CupoEmprende } from '@/services/emprendeCupoService'

type CupoEstado = {
  cupo: CupoEmprende | null
  error: boolean
}

/** Carga el cupo público de emprendedores. El fallo queda visible en el banner. */
export default function useCupoEmprende(): CupoEstado {
  const [cupo, setCupo] = useState<CupoEmprende | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelado = false
    emprendeCupoService.get()
      .then((res) => {
        if (!cancelado) setCupo(res.data)
      })
      .catch(() => {
        if (!cancelado) setError(true)
      })
    return () => { cancelado = true }
  }, [])

  return { cupo, error }
}
