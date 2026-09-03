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

/** Prefiere API; si vacío, usa localStorage legacy como seed temporal. */
export function extrasDesdeApiOLocal(
  empresa: EmpresaPerfil | null,
): Pick<FormNegocio, 'categoria' | 'instagram' | 'zona'> {
  const apiCategoria = empresa?.categoriaNegocio?.trim() ?? ''
  const apiInstagram = empresa?.instagram?.trim() ?? ''
  const apiZona = empresa?.zonaEnvio?.trim() ?? ''
  if (apiCategoria || apiInstagram || apiZona) {
    return {
      categoria: apiCategoria || FORM_NEGOCIO_INICIAL.categoria,
      instagram: apiInstagram || FORM_NEGOCIO_INICIAL.instagram,
      zona: apiZona || FORM_NEGOCIO_INICIAL.zona,
    }
  }
  const local = leerExtrasLocal()
  return {
    categoria: local.categoria || FORM_NEGOCIO_INICIAL.categoria,
    instagram: local.instagram || FORM_NEGOCIO_INICIAL.instagram,
    zona: local.zona || FORM_NEGOCIO_INICIAL.zona,
  }
}

export function formDesdeEmpresa(empresa: EmpresaPerfil): FormNegocio {
  const extras = extrasDesdeApiOLocal(empresa)
  return {
    nombre: empresa.nombreComercial ?? FORM_NEGOCIO_INICIAL.nombre,
    descripcion: descripcionVisible(empresa.descripcion) || FORM_NEGOCIO_INICIAL.descripcion,
    categoria: extras.categoria,
    whatsapp: empresa.numeroWhatsapp || FORM_NEGOCIO_INICIAL.whatsapp,
    instagram: extras.instagram,
    zona: extras.zona,
  }
}
