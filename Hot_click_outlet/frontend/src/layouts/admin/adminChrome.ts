import { esUsuarioSistema } from '@/utils/sistemaUser'

/**
 * Chrome claro del Super Admin / Sistema (Figma CLAUDECLICK).
 * El nav n-900 era el panel IT anterior.
 */
export function etiquetaChromeAdmin(userRole: string | null): 'Sistema' | 'Admin' {
  return esUsuarioSistema(userRole) ? 'Sistema' : 'Admin'
}
