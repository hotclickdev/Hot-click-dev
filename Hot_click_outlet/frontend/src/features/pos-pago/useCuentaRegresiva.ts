import { useEffect, useState } from 'react'

/** Un cobro por QR dura 15 minutos; más allá de este margen la fecha del servidor no es creíble. */
const MARGEN_MAXIMO_MS = 30 * 60 * 1000

/** `mm:ss` de lo que falta, o `null` si no hay fecha, ya pasó o es inverosímil. */
export function formatoRestante(restanteMs: number): string | null {
  if (!Number.isFinite(restanteMs) || restanteMs <= 0 || restanteMs > MARGEN_MAXIMO_MS) return null
  const total = Math.ceil(restanteMs / 1000)
  const min = Math.floor(total / 60)
  const seg = total % 60
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`
}

/**
 * Cuenta regresiva hasta `expiracion` (fecha sin zona del servidor).
 * Solo informa: nunca decide que el cobro venció. Al llegar a cero llama a
 * `alVencer` para que se vuelva a pedir el estado real al servidor.
 */
export function useCuentaRegresiva(expiracion: string | undefined, alVencer: () => void): string | null {
  const [ahora, setAhora] = useState(() => Date.now())
  const fin = expiracion ? new Date(expiracion).getTime() : Number.NaN
  const visible = formatoRestante(fin - ahora) !== null

  useEffect(() => {
    if (!visible) return
    const id = window.setInterval(() => setAhora(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [visible])

  const cruzoCero = Number.isFinite(fin) && fin - ahora <= 0 && fin - ahora > -MARGEN_MAXIMO_MS

  useEffect(() => {
    if (cruzoCero) alVencer()
  }, [cruzoCero, alVencer])

  return formatoRestante(fin - ahora)
}
