/** Clave persistida en `categoria.icono`. `valor` es el emoji legado (solo lectura). */
export const ICONOS_CATEGORIA = [
  { valor: '👕', clave: 'ropa', label: 'Ropa' },
  { valor: '👟', clave: 'calzad', label: 'Calzado' },
  { valor: '🎮', clave: 'videoj', label: 'Videojuegos' },
  { valor: '📱', clave: 'tecnol', label: 'Tecnología' },
  { valor: '🖥️', clave: 'comput', label: 'Computadoras' },
  { valor: '🪑', clave: 'mueble', label: 'Muebles' },
  { valor: '🏋️', clave: 'deport', label: 'Deportes' },
  { valor: '🧸', clave: 'juguet', label: 'Juguetes' },
  { valor: '🚗', clave: 'auto', label: 'Vehículos' },
  { valor: '💄', clave: 'belleza', label: 'Belleza' },
  { valor: '🍽️', clave: 'hogar', label: 'Hogar' },
  { valor: '📚', clave: 'libros', label: 'Libros' },
  { valor: '🎵', clave: 'musica', label: 'Música' },
  { valor: '🌿', clave: 'jardin', label: 'Jardín' },
  { valor: '🐾', clave: 'mascot', label: 'Mascotas' },
  { valor: '🎨', clave: 'arte', label: 'Arte' },
  { valor: '💍', clave: 'joyería', label: 'Joyería' },
  { valor: '🔧', clave: 'herram', label: 'Herramientas' },
  { valor: '🎁', clave: 'regal', label: 'Regalos' },
  { valor: '🧴', clave: 'cuidado', label: 'Cuidado personal' },
]

/** @param {string} [icono] */
function itemIconoCategoria(icono?: string) {
  if (!icono) return null
  return ICONOS_CATEGORIA.find((item) => item.valor === icono || item.clave === icono) ?? null
}

/** @param {string} [icono] */
export function claveIconoCategoria(icono?: string) {
  return itemIconoCategoria(icono)?.clave ?? null
}

/** @param {string} [icono] */
export function etiquetaIconoCategoria(icono?: string) {
  return itemIconoCategoria(icono)?.label ?? ''
}

/** @param {string} [icono] @param {{ clave: string, valor: string }} item */
export function iconoCategoriaEsItem(icono: string | undefined, item: { clave: string; valor: string }) {
  return icono === item.clave || icono === item.valor
}
