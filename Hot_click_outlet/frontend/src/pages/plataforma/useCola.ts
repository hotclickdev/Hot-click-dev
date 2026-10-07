import { useCallback, useEffect, useRef, useState } from 'react'
import { filasDe, type Fila } from './normalizar'

type Estado = 'carga' | 'listo' | 'error'

export function useCola(clave: string, cargar: () => Promise<{ data: unknown }>) {
  const cargarRef = useRef(cargar)
  cargarRef.current = cargar
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<Estado>('carga')
  const [mensaje, setMensaje] = useState('')

  const recargar = useCallback((opciones?: { silencio?: boolean }) => {
    if (!opciones?.silencio) {
      setEstado('carga')
      setMensaje('')
    }
    cargarRef.current()
      .then((respuesta) => {
        setFilas(filasDe(respuesta.data))
        setEstado('listo')
      })
      .catch((err: unknown) => {
        console.error(err)
        setFilas([])
        setMensaje('No se pudo cargar esta cola.')
        setEstado('error')
      })
  }, [clave])

  useEffect(() => { recargar() }, [recargar])
  return { filas, estado, mensaje, recargar }
}
