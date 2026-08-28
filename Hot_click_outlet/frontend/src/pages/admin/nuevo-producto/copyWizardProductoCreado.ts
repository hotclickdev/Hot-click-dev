/**
 * Tras crear en el wizard IT.
 * visibleCatalogo=false es negocio aún no activo, no revisión de producto.
 */
export function copyWizardProductoCreado(ocultoDelCatalogo: boolean) {
  if (ocultoDelCatalogo) {
    return {
      titulo: 'Producto listo',
      detalle: 'No hace falta aprobar este producto. Cuando el negocio esté activo, aparece en el catálogo.',
    }
  }
  return { titulo: 'Producto publicado', detalle: null }
}
