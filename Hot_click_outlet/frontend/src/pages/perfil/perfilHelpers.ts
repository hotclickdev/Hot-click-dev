import type { PedidoCliente } from '../pedidos/pedidoHelpers'

function esPedidoCliente(value: unknown): value is PedidoCliente {
  return typeof value === 'object' && value !== null
}

export function listaPedidosDesdeRespuesta(data: unknown): PedidoCliente[] {
  if (Array.isArray(data)) return data.filter(esPedidoCliente)
  if (data && typeof data === 'object' && 'content' in data) {
    const content = (data as { content: unknown }).content
    return Array.isArray(content) ? content.filter(esPedidoCliente) : []
  }
  return []
}

export function mensajeErrorApi(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: { message?: unknown } } }).response?.data
    const message = data && typeof data === 'object' && 'message' in data
      ? (data as { message: unknown }).message
      : undefined
    if (typeof message === 'string') return message
  }
  return undefined
}

export function textoCampoApi(data: unknown, campo: string): string | undefined {
  if (!data || typeof data !== 'object' || !(campo in data)) return undefined
  const valor = (data as Record<string, unknown>)[campo]
  return typeof valor === 'string' ? valor : undefined
}

export function flagCampoApi(data: unknown, campo: string): boolean | undefined {
  if (!data || typeof data !== 'object' || !(campo in data)) return undefined
  const valor = (data as Record<string, unknown>)[campo]
  return typeof valor === 'boolean' ? valor : undefined
}
