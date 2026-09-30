/**
 * Identidad del comerciante (art. 247 del Reglamento a la Ley N.° 7472).
 * Razón social, cédula, domicilio y cantón se completan cuando Andres los confirme.
 * No inventar esos datos.
 */
type IdentidadComerciante = {
  nombreComercial: string
  razonSocial: string | null
  cedula: string | null
  domicilio: string | null
  canton: string | null
  telefono: string
  telefonoWa: string
  correo: string
  dominio: string
  sitio: string
}

export const IDENTIDAD_COMERCIANTE: IdentidadComerciante = {
  nombreComercial: 'HotClick',
  razonSocial: null,
  cedula: null,
  domicilio: null,
  canton: null,
  telefono: '+506 8666-7888',
  telefonoWa: '50686667888',
  correo: 'hotclick.cr@gmail.com',
  dominio: 'hotclick.lat',
  sitio: 'https://hotclick.lat',
}

export const POLITICAS_ACTUALIZADAS = '30 de septiembre de 2026'
export const POLITICAS_ACTUALIZADAS_ISO = '2026-09-30'

/** Ley 7472 y art. 130 del Reglamento: ocho días hábiles desde el perfeccionamiento. */
export const PLAZO_RETRACTO = '8 días hábiles'
