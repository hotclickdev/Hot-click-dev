import type { Producto } from '@/types/producto'

export type FiltrosExtra = {
  tiendas: Set<string>
  hechoAPedido: boolean
  retiroEnTienda: boolean
}

export const FILTROS_EXTRA_VACIOS: FiltrosExtra = { tiendas: new Set(), hechoAPedido: false, retiroEnTienda: false }

export type TiendaCatalogo = { nombre: string; cantidad: number }

export type TipoChipEntendi = 'busqueda' | 'categoria' | 'precio' | 'tienda' | 'pedido' | 'retiro' | 'marca' | 'stock'

export type ChipEntendi = { clave: string; tipo: TipoChipEntendi; valor: string; etiqueta?: string }

const PALABRAS_VACIAS = new Set(['para', 'con', 'sin', 'por', 'los', 'las', 'del', 'una', 'uno', 'que', 'mis', 'tus', 'the', 'and', 'mi', 'de', 'el', 'la', 'en', 'al', 'lo', 'un', 'es', 'su'])
const LARGO_MINIMO_PALABRA = 4
const LARGO_MINIMO_CONSULTA = 3
/** Tope de lo que se manda al catálogo, al asistente y a recientes. */
export const LARGO_MAXIMO_CONSULTA = 120

export function hayFiltrosExtra(f: FiltrosExtra): boolean {
  return f.tiendas.size > 0 || f.hechoAPedido || f.retiroEnTienda
}

/** Filtros del Figma que no cubre filtrarCatalogo: tienda, hecho a pedido y retiro en tienda. */
export function filtrarExtras(productos: Producto[], f: FiltrosExtra): Producto[] {
  if (!hayFiltrosExtra(f)) return productos
  return productos
    .filter((p) => f.tiendas.size === 0 || (p.empresaNombre != null && f.tiendas.has(p.empresaNombre)))
    .filter((p) => !f.hechoAPedido || p.esPersonalizado === true)
    .filter((p) => !f.retiroEnTienda || p.bodegaPermiteRetiro === true)
}

/** Tiendas presentes en el catálogo con su cantidad de productos, de la más grande a la más chica. */
export function tiendasDelCatalogo(productos: Producto[]): TiendaCatalogo[] {
  const conteo = new Map<string, number>()
  for (const p of productos) {
    const nombre = p.empresaNombre?.trim()
    if (nombre) conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1)
  }
  return [...conteo.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre))
}

/** Chips "Entendí": lo que el catálogo interpretó de la búsqueda y los filtros, cada uno removible. */
export function chipsEntendi({
  search, categoriaNombre, priceMin, priceMax, extra, marcas = [], soloConStock = false,
}: {
  search: string
  categoriaNombre: string | null
  priceMin: string
  priceMax: string
  extra: FiltrosExtra
  /** Marcas filtradas (id y nombre), por ejemplo desde `?marcaId=`. */
  marcas?: { id: string; nombre: string }[]
  soloConStock?: boolean
}): ChipEntendi[] {
  const chips: ChipEntendi[] = []
  if (search.trim()) chips.push({ clave: 'busqueda', tipo: 'busqueda', valor: search.trim() })
  if (categoriaNombre) chips.push({ clave: 'categoria', tipo: 'categoria', valor: categoriaNombre })
  if (priceMin || priceMax) chips.push({ clave: 'precio', tipo: 'precio', valor: `${priceMin}|${priceMax}` })
  for (const tienda of extra.tiendas) chips.push({ clave: `tienda-${tienda}`, tipo: 'tienda', valor: tienda })
  if (extra.hechoAPedido) chips.push({ clave: 'pedido', tipo: 'pedido', valor: '' })
  if (extra.retiroEnTienda) chips.push({ clave: 'retiro', tipo: 'retiro', valor: '' })
  for (const marca of marcas) chips.push({ clave: `marca-${marca.id}`, tipo: 'marca', valor: marca.id, etiqueta: marca.nombre })
  if (soloConStock) chips.push({ clave: 'stock', tipo: 'stock', valor: '' })
  return chips
}

export type RangoPrecio = { desde: number | null; hasta: number | null }

export function leerRangoPrecio(valor: string): RangoPrecio {
  const [min = '', max = ''] = valor.split('|')
  return { desde: min ? Number(min) : null, hasta: max ? Number(max) : null }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function coincide(texto: string | null | undefined, consulta: string): boolean {
  return Boolean(texto) && normalizar(texto as string).includes(consulta)
}

/** Quita caracteres de control y recorta. El texto se muestra como texto, nunca como HTML. */
export function recortarConsulta(consulta: string): string {
  return consulta.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, LARGO_MAXIMO_CONSULTA)
}

/** Palabras útiles de una consulta: sin conectores ni trozos de menos de 3 letras. */
export function palabrasSignificativas(consulta: string): string[] {
  const vistas = new Set<string>()
  const salida: string[] = []
  for (const trozo of normalizar(consulta).split(/\s+/)) {
    const limpia = trozo.replace(/[^\p{L}\p{N}]/gu, '')
    if (limpia.length < LARGO_MINIMO_CONSULTA || PALABRAS_VACIAS.has(limpia) || vistas.has(limpia)) continue
    vistas.add(limpia)
    salida.push(limpia)
  }
  return salida
}

/** La frase completa o alguna de sus palabras aparece en alguno de los textos. */
export function camposCoincidenConsulta(campos: (string | null | undefined)[], consulta: string): boolean {
  const q = normalizar(consulta)
  if (q.length < 2) return false
  const textos = campos.filter((campo): campo is string => Boolean(campo?.trim())).map((campo) => normalizar(campo))
  if (textos.some((texto) => texto.includes(q))) return true
  const palabras = palabrasSignificativas(consulta)
  if (palabras.length === 0) return false
  const junto = textos.join(' ')
  return palabras.some((palabra) => junto.includes(palabra))
}

export function productoCoincideConsulta(producto: Producto, consulta: string): boolean {
  return camposCoincidenConsulta(
    [producto.nombre, producto.categoriaNombre, producto.marcaNombre, producto.descripcion, producto.empresaNombre],
    consulta,
  )
}

function puntajeConsulta(producto: Producto, consulta: string): number {
  const junto = normalizar([producto.nombre, producto.categoriaNombre, producto.marcaNombre, producto.descripcion, producto.empresaNombre].filter(Boolean).join(' '))
  const q = normalizar(consulta)
  const frase = q.length >= 2 && junto.includes(q) ? 10 : 0
  const palabras = palabrasSignificativas(consulta).filter((palabra) => junto.includes(palabra)).length
  return frase + palabras
}

/** Productos que contienen la frase o alguna palabra, los que más coinciden primero. */
export function filtrarProductosConsulta(productos: Producto[], consulta: string): Producto[] {
  if (normalizar(consulta).length < 2) return []
  return productos
    .filter((producto) => productoCoincideConsulta(producto, consulta))
    .sort((a, b) => puntajeConsulta(b, consulta) - puntajeConsulta(a, consulta) || (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'))
}

function agregarSugerencia(texto: string, consulta: string, maximo: number, salida: string[], vistas: Set<string>) {
  const clave = normalizar(texto)
  if (!clave || clave === normalizar(consulta) || vistas.has(clave) || salida.length >= maximo) return
  vistas.add(clave)
  salida.push(texto.toLowerCase())
}

function sugerenciasPorFragmento(fragmento: string, productos: Producto[], consulta: string, maximo: number, salida: string[], vistas: Set<string>) {
  const q = normalizar(fragmento)
  if (q.length < 2) return
  for (const producto of productos) {
    if (coincide(producto.categoriaNombre, q)) agregarSugerencia(producto.categoriaNombre as string, consulta, maximo, salida, vistas)
  }
  for (const producto of productos) {
    if (!coincide(producto.nombre, q)) continue
    agregarSugerencia((producto.nombre as string).split(/\s+/).slice(0, 4).join(' '), consulta, maximo, salida, vistas)
  }
}

/** Sugerencias que contienen la frase o, si no, alguna de sus palabras. Categorías primero. */
export function sugerenciasBusqueda(consulta: string, productos: Producto[], maximo = 3): string[] {
  if (normalizar(consulta).length < 2) return []
  const vistas = new Set<string>()
  const salida: string[] = []
  sugerenciasPorFragmento(consulta, productos, consulta, maximo, salida, vistas)
  if (salida.length >= maximo) return salida
  const completa = normalizar(consulta)
  for (const palabra of palabrasSignificativas(consulta)) {
    if (palabra === completa) continue
    sugerenciasPorFragmento(palabra, productos, consulta, maximo, salida, vistas)
    if (salida.length >= maximo) break
  }
  return salida
}

/** Parte un texto alrededor de la primera coincidencia (sin distinguir acentos) para resaltarla. */
export function partirCoincidencia(texto: string, consulta: string): { antes: string; coincidencia: string; despues: string } {
  const q = normalizar(consulta)
  const idx = q ? normalizar(texto).indexOf(q) : -1
  if (idx < 0) return { antes: texto, coincidencia: '', despues: '' }
  return { antes: texto.slice(0, idx), coincidencia: texto.slice(idx, idx + q.length), despues: texto.slice(idx + q.length) }
}

/** Búsquedas relacionadas: categorías y palabras de los productos encontrados, sin repetir la consulta. */
export function busquedasRelacionadas(consulta: string, encontrados: Producto[], maximo = 4): string[] {
  const q = normalizar(consulta)
  if (!q) return []
  const terminosConsulta = new Set(q.split(/\s+/))
  const vistas = new Set<string>()
  const salida: string[] = []
  const agregar = (texto: string) => {
    const clave = normalizar(texto)
    if (!clave || terminosConsulta.has(clave) || clave === q || vistas.has(clave) || salida.length >= maximo) return
    vistas.add(clave)
    salida.push(texto.toLowerCase())
  }
  for (const p of encontrados) if (p.categoriaNombre) agregar(p.categoriaNombre)
  for (const p of encontrados) {
    for (const palabra of (p.nombre ?? '').split(/\s+/)) {
      const limpia = palabra.replace(/[^\p{L}\p{N}]/gu, '')
      if (limpia.length >= LARGO_MINIMO_PALABRA && !PALABRAS_VACIAS.has(normalizar(limpia))) agregar(limpia)
    }
  }
  return salida
}

/** Mensaje prellenado de WhatsApp para Servicios HOT cuando la búsqueda no encuentra nada. */
export function mensajeServiciosHot(consulta: string): string {
  return `Hola HotClick, busco "${consulta.trim()}" y no lo encontré en el catálogo. ¿Me lo pueden conseguir?`
}
