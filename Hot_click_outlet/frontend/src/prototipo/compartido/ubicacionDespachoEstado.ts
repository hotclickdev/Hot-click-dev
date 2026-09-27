/** Respuesta de `GET /api/bodegas/ubicacion-despacho` para el negocio en sesión. */
export type EstadoUbicacionDespacho = {
  tieneUbicacion: boolean
  obligatoria: boolean
}

export const MENSAJE_FALTA_UBICACION =
  'Falta la ubicación de despacho. Sin ella tu negocio no se aprueba ni podés publicar productos.'

function registro(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === 'object' ? (valor as Record<string, unknown>) : null
}

/**
 * Lee el `ResponseDTO` (o el objeto plano). Si la forma no es la esperada
 * asume que hay ubicación: mejor no avisar que avisar de más.
 */
export function aEstadoUbicacionDespacho(data: unknown): EstadoUbicacionDespacho {
  const raiz = registro(data)
  const interno = registro(raiz && 'data' in raiz ? raiz.data : raiz)
  return {
    tieneUbicacion: interno?.tieneUbicacion !== false,
    obligatoria: interno?.obligatoria === true,
  }
}

export function debeAvisarFaltaUbicacion(estado: EstadoUbicacionDespacho | null): boolean {
  return estado !== null && !estado.tieneUbicacion
}
