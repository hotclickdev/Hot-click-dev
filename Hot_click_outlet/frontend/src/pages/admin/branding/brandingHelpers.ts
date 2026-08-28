export const FONTS_BRANDING = ['Inter', 'Poppins', 'Roboto', 'Nunito', 'Montserrat', 'Raleway', 'Lato', 'Open Sans']
export const COLOR_PRIMARIO_DEF = '#E73B33'
export const COLOR_SECUNDARIO_DEF = '#1E242E'

export type BrandingFormulario = {
  nombreComercial?: string
  tagline?: string
  descripcion?: string
  footerTexto?: string
  colorPrimario?: string
  colorSecundario?: string
  colorAcento?: string
  fontFamilia?: string
  logoUrl?: string
  faviconUrl?: string
  ogImagenUrl?: string
  dominioCustom?: string
}

export function inicialNombre(nombreComercial?: string) {
  return (nombreComercial || 'T')[0].toUpperCase()
}

export function pieVistaPrevia(form: BrandingFormulario) {
  return form.footerTexto || `© 2026 ${form.nombreComercial || 'Mi Tienda'}`
}

export function mensajeErrorBranding(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const error = (err as { response?: { data?: { error?: unknown } } }).response?.data?.error
  return typeof error === 'string' ? error : fallback
}
