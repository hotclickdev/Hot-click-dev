import type { PanelImpago } from '@/services/adminSuspensionService'

/** Lee la respuesta ResponseDTO del panel; ante forma inesperada devuelve listas vacías (nunca inventa datos). */
export function panelDe(body: unknown): PanelImpago {
  const data = (body as { data?: Partial<PanelImpago> } | null)?.data ?? {}
  return {
    diasGracia: Number(data.diasGracia ?? 0),
    diasExtension: Number(data.diasExtension ?? 0),
    enGracia: Array.isArray(data.enGracia) ? data.enGracia : [],
    suspendidas: Array.isArray(data.suspendidas) ? data.suspendidas : [],
  }
}

/** El motivo es obligatorio (mín. 3 caracteres) para la bitácora. */
export const motivoValido = (m: string) => m.trim().length >= 3

/** Tono de alerta según días restantes de gracia. */
export const tonoDias = (dias: number): 'alerta' | 'azul' | 'neutro' => (dias <= 1 ? 'alerta' : dias <= 3 ? 'azul' : 'neutro')
