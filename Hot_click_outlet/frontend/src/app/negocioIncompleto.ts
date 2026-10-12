/** EMPRENDEDOR sin empresa: el backend responde 403 EMPRESA_REQUERIDA; el panel muestra «Completá tu negocio». */
export function debeCompletarNegocio(userRole: string | null | undefined, empresaId: number | null | undefined): boolean {
  return userRole === 'EMPRENDEDOR' && (empresaId === null || empresaId === undefined)
}
