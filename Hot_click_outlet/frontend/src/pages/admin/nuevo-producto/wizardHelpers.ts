import type { ChangeEvent, Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { Id } from '@/types/api'

export type SeoLangCode = 'es' | 'en' | 'pt' | 'fr'

export type SeoLangFields = {
  title: string
  description: string
}

export type SeoByLang = {
  es: SeoLangFields
  en: SeoLangFields
  pt: SeoLangFields
  fr: SeoLangFields
}

export type SeoAutoFlags = {
  es: boolean
  en: boolean
  pt: boolean
  fr: boolean
}

export type TallaCantidad = {
  talla: string
  cantidad: number | string
}

/** Formulario del wizard — coincide con EMPTY_FORM. */
export type WizardForm = {
  nombre: string
  titulo: string
  descripcion: string
  descripcionLarga: string
  especificaciones: string
  comoUsar: string
  marcaId: string
  precioVenta: string
  precioCompra: string
  stock: string
  talla: string
  tallasCantidad: TallaCantidad[]
  garantiaDias: string
  condicion: string
  categoriaId: string
  bodegaId: string
  imagenUrl: string
  imagenes: string[]
  sku: string
  barcode: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  tags: string
  seoByLang: SeoByLang
  esPersonalizado: boolean
  modoPrecioPersonalizado: 'FIJO' | 'RANGO' | 'COTIZACION'
  precioPersonalizadoMin: string
  precioPersonalizadoMax: string
  instruccionesPersonalizacion: string
}

export type WizardCampoTexto = {
  [K in keyof WizardForm]: WizardForm[K] extends string ? K : never
}[keyof WizardForm]

export type SetCampo = (campo: WizardCampoTexto) => (
  e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => void

export type WizardStepId =
  | 'fotos'
  | 'nombre'
  | 'descripcion'
  | 'precios'
  | 'clasificacion'
  | 'detalles'
  | 'contenido'
  | 'seo'

export type WizardStep = {
  id: WizardStepId
  title: string
  subtitle: string | null
  optional?: boolean
  validate?: (f: WizardForm) => boolean
  validateMsg?: string
}

export type SeoLangOption = {
  code: SeoLangCode
  label: string
  name: string
}

export type WizardCategoria = {
  id?: Id
  nombreCategoria?: string
  nombre?: string
}

export type WizardBodega = {
  id?: Id
  nombreBodega?: string
  nombre?: string
}

export type WizardMarca = {
  id?: Id
  nombreMarca: string
}

export type ProductoCreadoWizard = {
  id?: Id
  nombre: string
  imagen: string
  ocultoDelCatalogo?: boolean
}

export type WizardToast = (opts: {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}) => void

export type WizardView = {
  previewUrls: string[]
  form: WizardForm
  STEPS: WizardStep[]
  wizardStep: number
  etiquetas: string[]
  fuenteDetalles: string | null
  validationMsg: string
  analizando: boolean
  isLastStep: boolean
  saving: boolean
  sinBodegas: boolean
  autoSaveLabel: string
  canQuickPublish: boolean
  onPrev: () => void
  onNext: () => void
  onSave: () => void | Promise<void>
  onGuardarBorrador: () => void
  tieneBorrador: boolean
  onCargarBorrador: () => void
  onLimpiarBorrador: () => void
  analizandoIdx: number
  imagenesFile: File[]
  onAddFiles: (files: File[], silentlyDropped?: number) => void
  onRemoveFile: (idx: number) => void
  onAnalizar: () => void | Promise<void>
  onSkip: () => void
  setCampo: SetCampo
  setForm: Dispatch<SetStateAction<WizardForm>>
  trademarkWarning: string
  priceWarning: boolean
  setPriceWarning: Dispatch<SetStateAction<boolean>>
  categories: WizardCategoria[]
  bodegas: WizardBodega[]
  marcas: WizardMarca[]
  loadingCatalog: boolean
  showNuevaMarca: boolean
  setShowNuevaMarca: Dispatch<SetStateAction<boolean>>
  nuevaMarca: string
  setNuevaMarca: Dispatch<SetStateAction<string>>
  creandoMarca: boolean
  onCrearMarca: () => void | Promise<void>
  seoLang: SeoLangCode
  setSeoLang: Dispatch<SetStateAction<SeoLangCode>>
  seoAuto: SeoAutoFlags
  setSeoAuto: Dispatch<SetStateAction<SeoAutoFlags>>
}

export type DraftTimerRef = MutableRefObject<ReturnType<typeof setTimeout> | null>

type ErrorRespuesta = {
  response?: {
    status?: unknown
    data?: { message?: unknown }
  }
}

export function mensajeErrorRespuesta(err: unknown): string | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) return undefined
  const message = (err as ErrorRespuesta).response?.data?.message
  return typeof message === 'string' ? message : undefined
}

export function statusErrorRespuesta(err: unknown): number | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) return undefined
  const status = (err as ErrorRespuesta).response?.status
  return typeof status === 'number' ? status : undefined
}

/** Formulario vacío del wizard de nuevo producto. */
export const EMPTY_FORM: WizardForm = {
  nombre: '', titulo: '', descripcion: '', descripcionLarga: '',
  especificaciones: '', comoUsar: '', marcaId: '',
  precioVenta: '', precioCompra: '', stock: '1', talla: '', tallasCantidad: [], garantiaDias: '0',
  condicion: 'NUEVO', categoriaId: '', bodegaId: '', imagenUrl: '', imagenes: [],
  sku: '', barcode: '',
  metaTitle: '', metaDescription: '', metaKeywords: '',
  tags: '',
  esPersonalizado: false,
  modoPrecioPersonalizado: 'FIJO',
  precioPersonalizadoMin: '',
  precioPersonalizadoMax: '',
  instruccionesPersonalizacion: '',
  seoByLang: {
    es: { title: '', description: '' },
    en: { title: '', description: '' },
    pt: { title: '', description: '' },
    fr: { title: '', description: '' },
  },
}

/** Pasos del wizard. El de SEO solo se muestra a ADMIN. */
export const ALL_STEPS: WizardStep[] = [
  { id: 'fotos',         title: 'Fotos del producto',           subtitle: 'Subí fotos para que la IA complete los datos automáticamente', optional: true },
  { id: 'nombre',        title: '¿Cómo se llama el producto?',  subtitle: null, validate: f => !!f.nombre.trim(), validateMsg: 'El nombre es obligatorio' },
  { id: 'descripcion',   title: 'Describí el producto',         subtitle: 'Una frase corta que verán los clientes en la tienda', optional: true },
  { id: 'precios',       title: 'Precios y stock',              subtitle: null, validate: validarPasoPrecios, validateMsg: 'Completá el precio o la configuración personalizada' },
  { id: 'clasificacion', title: 'Clasificación',                subtitle: 'Categoría, marca, condición y bodega', validate: f => !!f.categoriaId, validateMsg: 'La categoría es obligatoria' },
  { id: 'detalles',      title: 'Detalles del producto',        subtitle: 'Talla, garantía, SKU y código de barras', optional: true },
  { id: 'contenido',     title: 'Especificaciones y tags',      subtitle: 'Información técnica y etiquetas de búsqueda', optional: true },
  { id: 'seo',           title: 'SEO',                          subtitle: 'Cómo aparece este producto en Google', optional: true },
]

/** Idiomas SEO del producto (código, etiqueta corta y nombre). */
export const SEO_LANGS: SeoLangOption[] = [
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'fr', label: 'FR', name: 'Français' },
]

export const DRAFT_KEY = 'hotclick-draft-producto'

function validarPasoPrecios(f: WizardForm): boolean {
  if (f.esPersonalizado && f.modoPrecioPersonalizado === 'COTIZACION') return true
  if (f.esPersonalizado && f.modoPrecioPersonalizado === 'RANGO') {
    return !!f.precioPersonalizadoMin && !!f.precioPersonalizadoMax
  }
  return !!f.precioVenta
}

/**
 * Pasos visibles según el rol. El paso SEO queda solo para ADMIN.
 * @param {boolean} isAdmin
 */
export function stepsParaRol(isAdmin: boolean) {
  return isAdmin ? ALL_STEPS : ALL_STEPS.filter(s => s.id !== 'seo')
}

/**
 * Completa títulos y descripciones SEO automáticos por idioma.
 * @param {string} nombre
 * @param {string} descripcion
 * @param {string|number} precioVenta
 * @param {{ es?: boolean, en?: boolean, pt?: boolean, fr?: boolean }} seoAuto
 * @returns {Record<string, { title: string, description: string }>}
 */
export function seoByLangAuto(nombre: string, descripcion: string, precioVenta: string | number, seoAuto: SeoAutoFlags): Partial<SeoByLang> {
  const nombreSafe = nombre || ''
  const precio = precioVenta ? Number(precioVenta).toLocaleString('es-CR') : ''
  const desc = descripcion || ''
  const next: Partial<SeoByLang> = {}
  if (seoAuto.es) {
    next.es = {
      title: nombreSafe ? `${nombreSafe} | HotClick Outlet`.slice(0, 60) : '',
      description: descripcionSeoEs(desc, precio),
    }
  }
  if (seoAuto.en) {
    next.en = {
      title: nombreSafe ? `${nombreSafe} | HotClick Outlet`.slice(0, 60) : '',
      description: desc ? `${desc} | Free shipping in Costa Rica | HotClick`.slice(0, 160) : '',
    }
  }
  if (seoAuto.pt) {
    next.pt = {
      title: nombreSafe ? `${nombreSafe} | HotClick Outlet`.slice(0, 60) : '',
      description: desc ? `${desc} | Envio grátis pelo Costa Rica | HotClick`.slice(0, 160) : '',
    }
  }
  if (seoAuto.fr) {
    next.fr = {
      title: nombreSafe ? `${nombreSafe} | HotClick Outlet`.slice(0, 60) : '',
      description: desc ? `${desc} | Livraison gratuite au Costa Rica | HotClick`.slice(0, 160) : '',
    }
  }
  return next
}

function descripcionSeoEs(desc: string, precio: string) {
  if (!desc) return ''
  const extra = precio ? ` | Precio: ₡${precio}` : ''
  return `${desc}${extra} | Envíos a todo Costa Rica`.slice(0, 160)
}
