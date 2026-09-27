import { useState } from 'react'
import {
  UBICACION_INICIAL,
  erroresUbicacion,
  ubicacionCompleta,
  type ErroresUbicacion,
  type UbicacionDespacho,
} from '@/prototipo/compartido/ubicacionDespachoHelpers'

export type UbicacionDespachoForm = {
  ubicacion: UbicacionDespacho
  setUbicacion: (ubicacion: UbicacionDespacho) => void
  /** Errores por campo; vacío hasta el primer intento de avanzar. */
  errores: ErroresUbicacion
  /** Marca el intento y dice si la ubicación está completa. */
  validar: () => boolean
  reiniciar: () => void
}

/** Estado de la ubicación de despacho en los formularios de alta de negocio. */
export function useUbicacionDespachoForm(): UbicacionDespachoForm {
  const [ubicacion, setUbicacion] = useState<UbicacionDespacho>(UBICACION_INICIAL)
  const [intento, setIntento] = useState(false)

  const validar = () => {
    setIntento(true)
    return ubicacionCompleta(ubicacion)
  }

  const reiniciar = () => {
    setUbicacion(UBICACION_INICIAL)
    setIntento(false)
  }

  return {
    ubicacion,
    setUbicacion,
    errores: intento ? erroresUbicacion(ubicacion) : {},
    validar,
    reiniciar,
  }
}
