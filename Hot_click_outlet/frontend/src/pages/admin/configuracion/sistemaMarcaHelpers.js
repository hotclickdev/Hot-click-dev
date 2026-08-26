export const TAGLINE_MAX = 200
export const FOOTER_MAX = 500

export const MARCA_VACIA = {
  nombreComercial: '',
  tagline: '',
  numeroWhatsapp: '',
  colorPrimario: '#E73B33',
  colorSecundario: '#152B5E',
  colorAcento: '#1747A8',
  logoUrl: '',
  footerTexto: '',
}

/** Campos que el comprador ve en `/tienda/:slug`. */
export function marcaDesdeEmpresa(empresa) {
  const e = empresa?.id ? empresa : (empresa?.data ?? empresa ?? {})
  return {
    nombreComercial: e.nombreComercial ?? e.nombreEmpresa ?? '',
    tagline: e.tagline ?? '',
    numeroWhatsapp: e.numeroWhatsapp ?? '',
    colorPrimario: e.colorPrimario ?? '#E73B33',
    colorSecundario: e.colorSecundario ?? '#152B5E',
    colorAcento: e.colorAcento ?? '#1747A8',
    logoUrl: e.logoUrl ?? '',
    footerTexto: e.footerTexto ?? '',
  }
}

export function cuerpoMarca(form) {
  return {
    nombreComercial: form.nombreComercial.trim(),
    tagline: form.tagline.trim(),
    numeroWhatsapp: form.numeroWhatsapp.trim(),
    colorPrimario: form.colorPrimario,
    colorSecundario: form.colorSecundario,
    colorAcento: form.colorAcento,
    logoUrl: form.logoUrl,
    footerTexto: form.footerTexto.trim(),
  }
}

export function validarMarca(form) {
  const errores = {}
  if (!form.nombreComercial.trim()) errores.nombreComercial = 'El nombre comercial es requerido'
  if (form.tagline.length > TAGLINE_MAX) errores.tagline = `Máximo ${TAGLINE_MAX} caracteres`
  if (form.footerTexto.length > FOOTER_MAX) errores.footerTexto = `Máximo ${FOOTER_MAX} caracteres`
  return errores
}
