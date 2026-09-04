import {
  descripcionSinTagFotos,
  descripcionVisible,
  fotosDesdeDescripcion,
  type EmpresaPerfil,
} from '@/pages/admin/mi-empresa/miEmpresaHelpers'
import { leerExtrasLocal } from '@/prototipo/emprendedor/data/negocioExtras'

export const CATEGORIAS_NEGOCIO = ['Tecnología', 'Ropa', 'Hogar'] as const

export type FormNegocio = {
  nombre: string
  descripcion: string
  categoria: string
  whatsapp: string
  instagram: string
  zona: string
}

export type ExtrasFormNegocio = Pick<FormNegocio, 'categoria' | 'instagram' | 'zona'>

export const FORM_NEGOCIO_INICIAL: FormNegocio = {
  nombre: '',
  descripcion: '',
  categoria: CATEGORIAS_NEGOCIO[0],
  whatsapp: '',
  instagram: '',
  zona: '',
}

/** Reconstruye descripción preservando el bloque [FOTOS] embebido. */
export function armarDescripcion(visible: string, rawAnterior: string): string {
  const fotos = fotosDesdeDescripcion(rawAnterior)
  const limpia = descripcionSinTagFotos(visible)
  if (fotos.length === 0) return limpia
  return `${limpia}\n[FOTOS]${JSON.stringify(fotos)}[/FOTOS]`
}

/** Fuente de verdad: GET /empresa/perfil. No lee localStorage. */
export function extrasDesdeApi(empresa: EmpresaPerfil): ExtrasFormNegocio {
  return {
    categoria: empresa.categoriaNegocio?.trim() || FORM_NEGOCIO_INICIAL.categoria,
    instagram: empresa.instagram?.trim() || FORM_NEGOCIO_INICIAL.instagram,
    zona: empresa.zonaEnvio?.trim() || FORM_NEGOCIO_INICIAL.zona,
  }
}

/** Cache local solo si falló la red (GET/PUT). */
export function extrasOffline(): ExtrasFormNegocio {
  const local = leerExtrasLocal()
  return {
    categoria: local.categoria || FORM_NEGOCIO_INICIAL.categoria,
    instagram: local.instagram || FORM_NEGOCIO_INICIAL.instagram,
    zona: local.zona || FORM_NEGOCIO_INICIAL.zona,
  }
}

export function extrasDesdeForm(form: FormNegocio): ExtrasFormNegocio {
  return { categoria: form.categoria, instagram: form.instagram, zona: form.zona }
}

export function formConExtrasOffline(): FormNegocio {
  return { ...FORM_NEGOCIO_INICIAL, ...extrasOffline() }
}

export function formDesdeEmpresa(empresa: EmpresaPerfil): FormNegocio {
  const extras = extrasDesdeApi(empresa)
  return {
    nombre: empresa.nombreComercial ?? FORM_NEGOCIO_INICIAL.nombre,
    descripcion: descripcionVisible(empresa.descripcion) || FORM_NEGOCIO_INICIAL.descripcion,
    categoria: extras.categoria,
    whatsapp: empresa.numeroWhatsapp || FORM_NEGOCIO_INICIAL.whatsapp,
    instagram: extras.instagram,
    zona: extras.zona,
  }
}

/** Body de PUT /api/empresa/perfil (mismos campos que T-PF-021). */
export function bodyPerfilDesdeForm(form: FormNegocio, descRaw: string) {
  return {
    nombreComercial: form.nombre.trim(),
    descripcion: armarDescripcion(form.descripcion, descRaw),
    numeroWhatsapp: form.whatsapp.trim(),
    categoriaNegocio: form.categoria.trim(),
    instagram: form.instagram.trim(),
    zonaEnvio: form.zona.trim(),
  }
}
