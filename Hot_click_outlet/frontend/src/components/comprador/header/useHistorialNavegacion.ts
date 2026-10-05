import { useEffect, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { indiceHistorial, puedeAvanzar, puedeVolverAtras } from './headerHelpers'

/**
 * El máximo vive fuera del componente: cada pantalla monta su propio layout.
 * Se actualiza después del render, cuando el tipo de navegación ya es el definitivo.
 */
let indiceMaximoVisita = 0

/**
 * Atrás y adelante de esta visita. Un avance nuevo borra lo que había adelante;
 * un retroceso lo conserva hasta que el usuario elige otra pantalla.
 */
export function useHistorialNavegacion() {
  const location = useLocation()
  const tipo = useNavigationType()
  const indice = indiceHistorial(window.history.state) ?? 0
  const [, refrescar] = useState(0)

  useEffect(() => {
    const siguiente = tipo === 'POP' ? Math.max(indiceMaximoVisita, indice) : indice
    if (siguiente === indiceMaximoVisita) return
    indiceMaximoVisita = siguiente
    refrescar((n) => n + 1)
  }, [location.key, tipo, indice])

  return {
    puedeAtras: puedeVolverAtras(window.history.state),
    puedeAdelante: puedeAvanzar(indice, indiceMaximoVisita),
  }
}
