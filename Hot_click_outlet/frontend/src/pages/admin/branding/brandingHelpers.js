export const FONTS_BRANDING = ['Inter', 'Poppins', 'Roboto', 'Nunito', 'Montserrat', 'Raleway', 'Lato', 'Open Sans']
export const COLOR_PRIMARIO_DEF = '#E73B33'
export const COLOR_SECUNDARIO_DEF = '#1E242E'

export function inicialNombre(nombreComercial) {
  return (nombreComercial || 'T')[0].toUpperCase()
}

export function pieVistaPrevia(form) {
  return form.footerTexto || `© 2026 ${form.nombreComercial || 'Mi Tienda'}`
}
