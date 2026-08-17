/** Límite de fotos para roles estándar. */
export const LIMIT_DEFAULT = 100

/** Límite de fotos para ADMIN y SUPER_ADMIN. */
export const LIMIT_EXTENDED = 1500

/** Roles que pueden cargar más de LIMIT_DEFAULT fotos. */
export const EXTENDED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN'])

/** Máximo de fotos extra por producto (además de la principal). */
export const MAX_EXTRA = 9

/** Tamaño máximo por imagen en bytes (10 MB). */
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024

/**
 * Crea un borrador de producto a partir de un archivo de imagen.
 * @param {File} file
 * @returns {{
 *   id: string,
 *   mainFile: File,
 *   mainPreview: string,
 *   extraFiles: File[],
 *   extraPreviews: string[],
 *   nombre: string,
 *   categoriaId: string,
 *   precioVenta: string,
 *   precioCompra: string,
 *   stock: string,
 * }}
 */
export function createDraft(file) {
  return {
    id: globalThis.crypto.randomUUID(),
    mainFile: file,
    mainPreview: URL.createObjectURL(file),
    extraFiles: [],
    extraPreviews: [],
    nombre: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim(),
    categoriaId: '',
    precioVenta: '',
    precioCompra: '',
    stock: '1',
  }
}
