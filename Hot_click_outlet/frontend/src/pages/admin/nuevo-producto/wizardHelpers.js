/** Formulario vacío del wizard de nuevo producto. */
export const EMPTY_FORM = {
  nombre: '', titulo: '', descripcion: '', descripcionLarga: '',
  especificaciones: '', comoUsar: '', marcaId: '',
  precioVenta: '', precioCompra: '', stock: '1', talla: '', tallasCantidad: [], garantiaDias: '0',
  condicion: 'NUEVO', categoriaId: '', bodegaId: '', imagenUrl: '', imagenes: [],
  sku: '', barcode: '',
  metaTitle: '', metaDescription: '', metaKeywords: '',
  tags: '',
  seoByLang: {
    es: { title: '', description: '' },
    en: { title: '', description: '' },
    pt: { title: '', description: '' },
    fr: { title: '', description: '' },
  },
}

/** Pasos del wizard. El de SEO solo se muestra a ADMIN. */
export const ALL_STEPS = [
  { id: 'fotos',         title: 'Fotos del producto',           subtitle: 'Subí fotos para que la IA complete los datos automáticamente', optional: true },
  { id: 'nombre',        title: '¿Cómo se llama el producto?',  subtitle: null, validate: f => !!f.nombre.trim(), validateMsg: 'El nombre es obligatorio' },
  { id: 'descripcion',   title: 'Describí el producto',         subtitle: 'Una frase corta que verán los clientes en la tienda', optional: true },
  { id: 'precios',       title: 'Precios y stock',              subtitle: null, validate: f => !!f.precioVenta, validateMsg: 'El precio de venta es obligatorio' },
  { id: 'clasificacion', title: 'Clasificación',                subtitle: 'Categoría, marca, condición y bodega', validate: f => !!f.categoriaId, validateMsg: 'La categoría es obligatoria' },
  { id: 'detalles',      title: 'Detalles del producto',        subtitle: 'Talla, garantía, SKU y código de barras', optional: true },
  { id: 'contenido',     title: 'Especificaciones y tags',      subtitle: 'Información técnica y etiquetas de búsqueda', optional: true },
  { id: 'seo',           title: 'SEO',                          subtitle: 'Cómo aparece este producto en Google', optional: true },
]

/** Idiomas SEO del producto (código, etiqueta corta y nombre). */
export const SEO_LANGS = [
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'fr', label: 'FR', name: 'Français' },
]

export const DRAFT_KEY = 'hotclick-draft-producto'

/**
 * Pasos visibles según el rol. El paso SEO queda solo para ADMIN.
 * @param {boolean} isAdmin
 */
export function stepsParaRol(isAdmin) {
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
export function seoByLangAuto(nombre, descripcion, precioVenta, seoAuto) {
  const nombreSafe = nombre || ''
  const precio = precioVenta ? Number(precioVenta).toLocaleString('es-CR') : ''
  const desc = descripcion || ''
  const next = {}
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

function descripcionSeoEs(desc, precio) {
  if (!desc) return ''
  const extra = precio ? ` | Precio: ₡${precio}` : ''
  return `${desc}${extra} | Envíos a todo Costa Rica`.slice(0, 160)
}
