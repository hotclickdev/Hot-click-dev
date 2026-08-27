import { formatoColon } from '@/theme/formatoColon'

const miles = new Intl.NumberFormat('es-CR')

/** Formatea un entero con miles es-CR (KPIs, no montos). */
export function formatoEntero(n: number): string {
  return miles.format(Math.round(n))
}

export function formatoPrecio(colones: number): string {
  return formatoColon(colones)
}

export type EstadoTienda = 'Activa' | 'Pendiente' | 'Suspendida'
export type RolUsuario = 'Vendedor' | 'Comprador' | 'Suspendido'
export type TonoBadge = 'ok' | 'warn' | 'danger' | 'muted' | 'rol'

export const KPI_ADMIN = {
  tiendasActivas: 48,
  vendedores: 63,
  productosPublicados: 1240,
  ventasTotales: 8_450_000,
  comisionPlataforma: '8%',
} as const

export const TIENDAS = [
  {
    id: 'qa2',
    nombre: 'QA2 Emprendedor',
    handle: 'qa2.emprendedor',
    email: 'qa2@hotclick.lat',
    estado: 'Activa' as EstadoTienda,
    productos: 12,
    ventas: 126,
    ingresos: 890_000,
    registrada: '12/03/2026',
    plan: 'Plan Emprendedor',
    rating: '4.8',
  },
  {
    id: 'techzone',
    nombre: 'TechZone CR',
    handle: 'carlos.tech',
    email: 'carlos.tech@hotclick.lat',
    estado: 'Activa' as EstadoTienda,
    productos: 88,
    ventas: 340,
    ingresos: 2_100_000,
    registrada: '02/02/2025',
    plan: 'Plan PYME',
    rating: '4.6',
  },
  {
    id: 'moda',
    nombre: 'Moda Urbana',
    handle: 'maria.moda',
    email: 'maria.moda@hotclick.lat',
    estado: 'Pendiente' as EstadoTienda,
    productos: 0,
    ventas: 0,
    ingresos: 0,
    registrada: '26/08/2026',
    plan: 'Plan Emprendedor',
    rating: '—',
  },
  {
    id: 'casa',
    nombre: 'Casa & Deco',
    handle: 'laura.deco',
    email: 'laura.deco@hotclick.lat',
    estado: 'Activa' as EstadoTienda,
    productos: 24,
    ventas: 61,
    ingresos: 410_000,
    registrada: '18/05/2026',
    plan: 'Plan Emprendedor',
    rating: '4.4',
  },
  {
    id: 'sportfit',
    nombre: 'SportFit Outlet',
    handle: 'jose.sport',
    email: 'jose.sport@hotclick.lat',
    estado: 'Suspendida' as EstadoTienda,
    productos: 15,
    ventas: 40,
    ingresos: 190_000,
    registrada: '03/01/2026',
    plan: 'Plan Emprendedor',
    rating: '3.9',
  },
  {
    id: 'belleza',
    nombre: 'Belleza Total',
    handle: 'ana.belleza',
    email: 'ana.belleza@hotclick.lat',
    estado: 'Pendiente' as EstadoTienda,
    productos: 0,
    ventas: 0,
    ingresos: 0,
    registrada: '26/08/2026',
    plan: 'Plan Emprendedor',
    rating: '—',
  },
] as const

export const USUARIOS = [
  { id: 'qa2', nombre: 'qa2.emprendedor', email: 'qa2@hotclick.lat', rol: 'Vendedor' as RolUsuario, tienda: 'QA2 Emprendedor', miembro: 'Mar 2026' },
  { id: 'carlos', nombre: 'Carlos Rodríguez', email: 'carlos.tech@hotclick.lat', rol: 'Vendedor' as RolUsuario, tienda: 'TechZone CR', miembro: 'Feb 2025' },
  { id: 'maria', nombre: 'María Fernández', email: 'maria.moda@hotclick.lat', rol: 'Suspendido' as RolUsuario, tienda: 'Moda Urbana', miembro: 'Ago 2026' },
  { id: 'diego', nombre: 'Diego Salas', email: 'diego.s@gmail.com', rol: 'Comprador' as RolUsuario, tienda: '—', miembro: 'Ene 2026' },
  { id: 'ana', nombre: 'Ana Jiménez', email: 'ana.j@gmail.com', rol: 'Comprador' as RolUsuario, tienda: '—', miembro: 'Nov 2025' },
] as const

export const PRODUCTOS_MODERACION = [
  { id: 'zapatillas', nombre: 'Zapatillas Runner Pro', meta: 'TechZone CR · Ropa', precio: 32_000 },
  { id: 'smartwatch', nombre: 'Smartwatch Fit 5', meta: 'TechZone CR · Tecnología', precio: 45_000 },
  { id: 'vestido', nombre: 'Vestido Floral Verano', meta: 'Moda Urbana · Ropa', precio: 18_900 },
  { id: 'lampara', nombre: 'Lámpara LED Escritorio', meta: 'Casa & Deco · Tecnología', precio: 9_500 },
] as const

export const PRODUCTOS_PREVIEW = [
  { id: 'auriculares', nombre: 'Auriculares Bluetooth X200', precio: 18_500 },
  { id: 'camiseta', nombre: 'Camiseta Oversize Negra', precio: 9_900 },
  { id: 'cargador', nombre: 'Cargador USB-C 30W', precio: 7_200 },
  { id: 'mouse', nombre: 'Mouse Inalámbrico Pro', precio: 12_400 },
  { id: 'funda', nombre: 'Funda para Celular', precio: 4_800 },
  { id: 'jean', nombre: 'Jean Slim Fit Azul', precio: 21_000 },
  { id: 'buzo', nombre: 'Buzo Canguro Gris', precio: 15_500 },
] as const

export const CATEGORIAS = [
  { id: 'tecnologia', nombre: 'Tecnología', productos: 612 },
  { id: 'ropa', nombre: 'Ropa', productos: 498 },
  { id: 'hogar', nombre: 'Hogar', productos: 130 },
] as const

export const REGLAS_MODERACION = [
  { id: 'foto', texto: 'Requiere foto real del producto (no stock photos)', activa: true },
  { id: 'precio', texto: 'Precio mínimo ₡1.000 por publicación', activa: true },
  { id: 'ofensas', texto: 'Revisión automática de descripciones ofensivas', activa: true },
  { id: 'tech', texto: 'Aprobación manual para categoría Tecnología', activa: false },
] as const

export const METODOS_PAGO = [
  { id: 'sinpe', nombre: 'SINPE Móvil', habilitado: true },
  { id: 'tarjeta', nombre: 'Tarjeta de crédito/débito', habilitado: true },
  { id: 'transferencia', nombre: 'Transferencia bancaria', habilitado: true },
  { id: 'contraentrega', nombre: 'Pago contra entrega', habilitado: false },
] as const

export const NOTIFICACIONES = [
  {
    id: 'pago',
    titulo: 'Pago rechazado',
    cuerpo: 'TechZone CR tiene su suscripción vencida hace 3 días.',
    cuando: 'Hace 20 min',
    tono: 'danger' as const,
  },
  {
    id: 'mod',
    titulo: '6 productos esperando revisión',
    cuerpo: 'Hay publicaciones pendientes de moderación hace más de 24h.',
    cuando: 'Hace 2 horas',
    tono: 'warn' as const,
  },
  {
    id: 'tienda',
    titulo: 'Nueva tienda registrada',
    cuerpo: 'Belleza Total se registró y está pendiente de aprobación.',
    cuando: 'Hoy, 9:10 a.m.',
    tono: 'muted' as const,
  },
] as const

export const ERRORES_CARGA = [
  { fila: 'Fila 12', motivo: 'Precio vacío' },
  { fila: 'Fila 45', motivo: 'Categoría inválida' },
  { fila: 'Fila 88', motivo: 'Nombre duplicado' },
  { fila: 'Fila 120', motivo: 'Precio vacío' },
] as const

export const MARCAS = [
  { id: 'hotclick', nombre: 'HotClick Original', productos: 340, verificada: true },
  { id: 'samsung', nombre: 'Samsung', productos: 88, verificada: true },
  { id: 'nike', nombre: 'Nike', productos: 52, verificada: false },
  { id: 'generica', nombre: 'Genérica / Sin marca', productos: 610, verificada: false },
] as const

export const GARANTIAS = [
  { id: 'tech', nombre: 'Tecnología', plazo: '30 días' },
  { id: 'ropa', nombre: 'Ropa', plazo: '15 días' },
  { id: 'hogar', nombre: 'Hogar', plazo: '15 días' },
  { id: 'general', nombre: 'General (por defecto)', plazo: '8 días' },
] as const

export const CLIENTES = [
  { id: 'diego', nombre: 'Diego Salas', email: 'diego.s@gmail.com', compras: 14, total: 182_400 },
  { id: 'ana', nombre: 'Ana Jiménez', email: 'ana.j@gmail.com', compras: 9, total: 96_500 },
  { id: 'fernanda', nombre: 'Fernanda Solís', email: 'fer.solis@gmail.com', compras: 7, total: 71_200 },
  { id: 'ricardo', nombre: 'Ricardo Ureña', email: 'r.urena@gmail.com', compras: 3, total: 28_900 },
] as const

export const AUDITORIAS = [
  { id: 'a1', actor: 'Admin', detalle: 'Aprobó el producto Zapatillas Runner Pro de TechZone CR', cuando: 'Hace 12 min' },
  { id: 'a2', actor: 'TechZone CR', detalle: 'Actualizó su método de cobro', cuando: 'Hace 40 min' },
  { id: 'a3', actor: 'QA2 Emprendedor', detalle: 'Publicó Auriculares Bluetooth X200', cuando: 'Hoy, 9:15 a.m.' },
  { id: 'a4', actor: 'Moda Urbana', detalle: 'Se registró y quedó pendiente de aprobación', cuando: 'Ayer' },
  { id: 'a5', actor: 'Admin', detalle: 'Suspendió temporalmente a SportFit Outlet', cuando: 'Hace 2 días' },
] as const

export const SERVICIOS_HOT = [
  { id: 'foto', nombre: 'Fotografía profesional', precio: '₡15.000 / sesión', activo: true },
  { id: 'ads', nombre: 'Publicidad destacada', precio: '₡8.000 / semana', activo: true },
  { id: 'asesoria', nombre: 'Asesoría de ventas 1:1', precio: '₡20.000 / hora', activo: true },
  { id: 'envio', nombre: 'Envío exprés HotClick', precio: '₡3.500 / envío', activo: false },
] as const

export const APROBACIONES_TIENDA = [
  { id: 'moda', nombre: 'Moda Urbana', handle: 'maria.moda', cuando: 'Hoy' },
  { id: 'belleza', nombre: 'Belleza Total', handle: 'ana.belleza', cuando: 'Ayer' },
] as const

export const TESTIMONIOS = [
  { id: 't1', autor: 'Diego Salas', sobre: 'Sobre TechZone CR', puntos: 5, texto: 'Llegó rapidísimo y el producto era exactamente como se veía en las fotos.', visible: true },
  { id: 't2', autor: 'Ana Jiménez', sobre: 'Sobre QA2 Emprendedor', puntos: 4, texto: 'Buena atención, aunque tardó un poco más de lo esperado.', visible: true },
  { id: 't3', autor: 'Ricardo Ureña', sobre: 'Sobre Moda Urbana', puntos: 2, texto: 'La talla no coincidía con la tabla de medidas.', visible: false },
] as const

export const HERRAMIENTAS = [
  { to: '/prototipo/admin/herramientas/marcas', label: 'Marcas' },
  { to: '/prototipo/admin/herramientas/garantias', label: 'Garantías' },
  { to: '/prototipo/admin/herramientas/clientes', label: 'Clientes' },
  { to: '/prototipo/admin/herramientas/auditorias', label: 'Auditorías y Actividad' },
  { to: '/prototipo/admin/herramientas/servicios', label: 'Servicios Hot' },
  { to: '/prototipo/admin/herramientas/aprobaciones', label: 'Aprobaciones' },
  { to: '/prototipo/admin/herramientas/testimonios', label: 'Testimonios' },
] as const

export const CONFIG_LINKS = [
  { to: '/prototipo/admin/config/categorias', label: 'Categorías del catálogo' },
  { to: '/prototipo/admin/config/politica', label: 'Política de moderación' },
  { to: '/prototipo/admin/config/pagos', label: 'Métodos de pago aceptados' },
  { to: '/prototipo/admin/config/notificaciones', label: 'Notificaciones del sistema' },
  { to: '/prototipo/admin/cerrar-sesion', label: 'Cerrar sesión' },
] as const

export function tiendaPorId(id: string) {
  return TIENDAS.find((t) => t.id === id)
}

export function usuarioPorId(id: string) {
  return USUARIOS.find((u) => u.id === id)
}

export function productoPorId(id: string) {
  return PRODUCTOS_MODERACION.find((p) => p.id === id)
}

export function tonoEstadoTienda(estado: EstadoTienda): TonoBadge {
  if (estado === 'Activa') return 'ok'
  if (estado === 'Pendiente') return 'warn'
  return 'danger'
}

export function tonoRol(rol: RolUsuario): TonoBadge {
  if (rol === 'Suspendido') return 'danger'
  return 'rol'
}

export function letraDe(nombre: string): string {
  return (nombre.trim()[0] ?? '?').toUpperCase()
}
