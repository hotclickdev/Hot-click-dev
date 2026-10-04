/** Reglas de la tarjeta "Instalá HotClick" (nota del Figma `55:2658`). */
export const VISITAS_MINIMAS = 2
export const DIAS_DESCARTE = 30
const MS_POR_DIA = 86_400_000

export const CLAVE_ESTADO_INSTALAR = 'hc-instalar-app'
export const CLAVE_VISITA_SESION = 'hc-instalar-app-visita'

export type EstadoInstalar = {
  /** Sesiones distintas en las que el comprador abrió el marketplace. */
  visitas: number
  /** Epoch ms hasta el que "Ahora no" oculta la tarjeta. */
  descartadaHasta: number | null
}

export const ESTADO_INICIAL: EstadoInstalar = { visitas: 0, descartadaHasta: null }

export function parsearEstado(crudo: string | null): EstadoInstalar {
  if (!crudo) return ESTADO_INICIAL
  try {
    const d = JSON.parse(crudo) as Partial<EstadoInstalar>
    const visitas = Number.isFinite(d.visitas) ? Math.max(0, Number(d.visitas)) : 0
    const descartadaHasta = typeof d.descartadaHasta === 'number' ? d.descartadaHasta : null
    return { visitas, descartadaHasta }
  } catch {
    return ESTADO_INICIAL
  }
}

export function registrarVisita(estado: EstadoInstalar): EstadoInstalar {
  return { ...estado, visitas: estado.visitas + 1 }
}

export function descartarTarjeta(estado: EstadoInstalar, ahora: number): EstadoInstalar {
  return { ...estado, descartadaHasta: ahora + DIAS_DESCARTE * MS_POR_DIA }
}

type Contexto = {
  estado: EstadoInstalar
  ahora: number
  /** El navegador ofreció la instalación (beforeinstallprompt). */
  puedeInstalar: boolean
  /** Ya corre como app instalada. */
  instalada: boolean
  /** Es la página con la que entró a la sesión: ahí nunca se muestra. */
  esPrimeraPagina: boolean
}

/** Desde la 2.ª visita, nunca en la primera página y respetando los 30 días de "Ahora no". */
export function debeMostrarTarjeta({ estado, ahora, puedeInstalar, instalada, esPrimeraPagina }: Contexto): boolean {
  if (!puedeInstalar || instalada || esPrimeraPagina) return false
  if (estado.descartadaHasta !== null && ahora < estado.descartadaHasta) return false
  return estado.visitas >= VISITAS_MINIMAS
}
