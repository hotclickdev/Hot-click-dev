export type Fila = Record<string, unknown>

export function filasDe(data: unknown): Fila[] {
  if (Array.isArray(data)) return data.filter(esObjeto)
  if (!esObjeto(data)) return []
  if (Array.isArray(data.content)) return data.content.filter(esObjeto)
  return []
}

export function campoLista(data: unknown, campo: string): Fila[] {
  if (!esObjeto(data) || !(campo in data)) return filasDe(data)
  return filasDe(data[campo])
}

export function texto(valor: unknown, vacio = ''): string {
  if (typeof valor === 'string') return valor.trim()
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor)
  return vacio
}

export function idSeguro(fila: Fila): string | null {
  const id = fila.id
  if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) return String(id)
  if (typeof id === 'string' && /^[1-9]\d*$/.test(id)) return id
  return null
}

const SUSPENDIDOS = new Set(['SUSPENDIDO', 'INACTIVO', 'RECHAZADO'])

export function filtrarNegocios(filas: Fila[], filtro: string, consulta: string): Fila[] {
  const needle = consulta.trim().toLowerCase()
  return filas.filter((fila) => {
    const estado = texto(fila.estadoEmpresa).toUpperCase()
    if (filtro === 'pendientes' && estado !== 'PENDIENTE_APROBACION') return false
    if (filtro === 'suspendidos' && !SUSPENDIDOS.has(estado)) return false
    if (!needle) return true
    const blob = [fila.nombreComercial, fila.nombreEmpresa, fila.slug, fila.correoEmpresa]
      .map((parte) => texto(parte).toLowerCase())
      .join(' ')
    return blob.includes(needle)
  })
}

export function contarAtrasadas(filas: Fila[]): number {
  return filas.filter((fila) => {
    const estado = texto(fila.estado ?? fila.status ?? fila.estadoSuscripcion).toUpperCase()
    return estado.includes('PAST') || estado.includes('VENCID') || estado.includes('MORA')
  }).length
}

export function destinoPlataformaDesdeAdmin(pathname: string): string {
  if (pathname.startsWith('/admin/empresas/')) {
    const id = pathname.slice('/admin/empresas/'.length).split('/')[0] ?? ''
    return /^[1-9]\d*$/.test(id) ? `/plataforma/negocios/${id}` : '/plataforma/negocios'
  }
  const alias: Array<[string, string]> = [
    ['/admin/aprobaciones', '/plataforma/moderacion'],
    ['/admin/reportes-producto', '/plataforma/moderacion/reportes'],
    ['/admin/pagos', '/plataforma/dinero/cobros'],
    ['/admin/payouts', '/plataforma/dinero/liquidaciones'],
    ['/admin/saas-billing', '/plataforma/dinero/suscripciones'],
    ['/admin/soporte', '/plataforma/operacion/atencion'],
    ['/admin/security', '/plataforma/seguridad'],
    ['/admin/ai-control', '/plataforma/ia'],
    ['/admin/superadmin', '/plataforma/reglas'],
    ['/admin/crm', '/plataforma/crm'],
  ]
  for (const [desde, hacia] of alias) {
    if (pathname === desde || pathname.startsWith(`${desde}/`)) return hacia
  }
  return '/plataforma'
}

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/
const IPV6 = /^[0-9A-Fa-f:.]{2,45}$/

export function ipValida(valor: string): boolean {
  const limpio = valor.trim()
  if (!limpio || limpio.length > 45) return false
  if (!limpio.includes(':')) return IPV4.test(limpio)
  return IPV6.test(limpio)
}

export function tituloAlerta(fila: Fila): string {
  const tipo = texto(fila.titulo, texto(fila.alertType, texto(fila.tipo, 'Alerta')))
  const gravedad = texto(fila.severity, '')
  return gravedad ? `${tipo} · ${gravedad}` : tipo
}

export function detalleAlerta(fila: Fila): string {
  const base = texto(fila.detalle, texto(fila.message, texto(fila.mensaje, '')))
  const ip = ipDeFila(fila)
  if (!ip || base.includes(ip)) return base
  return base ? `${base} · ${ip}` : ip
}

export function ipDeFila(fila: Fila): string {
  return texto(fila.ipAddress, texto(fila.ip, ''))
}

function esObjeto(valor: unknown): valor is Fila {
  return valor != null && typeof valor === 'object' && !Array.isArray(valor)
}
