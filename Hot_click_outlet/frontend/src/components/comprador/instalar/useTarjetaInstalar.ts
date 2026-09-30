import { useCallback, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt'
import { esPwaStandalone } from '@/utils/pwaDisplay'
import {
  CLAVE_ESTADO_INSTALAR, CLAVE_VISITA_SESION, ESTADO_INICIAL, debeMostrarTarjeta, descartarTarjeta,
  parsearEstado, registrarVisita, type EstadoInstalar,
} from './tarjetaInstalarHelpers'

function leerEstado(): EstadoInstalar {
  try {
    return parsearEstado(localStorage.getItem(CLAVE_ESTADO_INSTALAR))
  } catch {
    return ESTADO_INICIAL
  }
}

function guardarEstado(estado: EstadoInstalar): void {
  try {
    localStorage.setItem(CLAVE_ESTADO_INSTALAR, JSON.stringify(estado))
  } catch {
    /* almacenamiento bloqueado: la tarjeta simplemente no persiste */
  }
}

/** Cuenta una visita por sesión del navegador (sessionStorage). */
function contarVisitaDeSesion(estado: EstadoInstalar): EstadoInstalar {
  try {
    if (sessionStorage.getItem(CLAVE_VISITA_SESION)) return estado
    sessionStorage.setItem(CLAVE_VISITA_SESION, '1')
  } catch {
    return estado
  }
  const siguiente = registrarVisita(estado)
  guardarEstado(siguiente)
  return siguiente
}

/** Estado y acciones de la tarjeta "Instalá HotClick" del Home. */
export function useTarjetaInstalar() {
  const { canInstall, instalar } = usePwaInstallPrompt()
  // React Router marca con key "default" la entrada con la que se abrió la app.
  const { key } = useLocation()
  // Idempotente por sesión: un segundo montaje (StrictMode, volver al Home) no suma otra visita.
  const [estado, setEstado] = useState<EstadoInstalar>(() => contarVisitaDeSesion(leerEstado()))
  const [ahora] = useState(Date.now)

  const descartar = useCallback(() => {
    const siguiente = descartarTarjeta(leerEstado(), Date.now())
    guardarEstado(siguiente)
    setEstado(siguiente)
  }, [])

  const visible = debeMostrarTarjeta({
    estado,
    ahora,
    puedeInstalar: canInstall,
    instalada: esPwaStandalone(),
    esPrimeraPagina: key === 'default',
  })

  return { visible, instalar, descartar }
}
