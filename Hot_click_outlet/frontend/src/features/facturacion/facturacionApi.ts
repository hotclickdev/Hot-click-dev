import api from '@/services/api'

/**
 * S5-20 · Admin → Facturación. Rutas y validación reales en #202 (`docs/contratos/S5-esqueletos-pendientes-dueno.md`), pero
 * responden 501 `PENDIENTE_DECISION_DUENO` hasta que el dueño decida (S1-07, S5-01, S5-04). Solo ADMIN (los negocios reciben 403).
 *   GET  /api/admin/facturacion/por-facturar        → [{ id, numero, negocio, fecha, total, estado: 'PAGADO'|'ENTREGADO', esteMes }]
 *   GET  /api/admin/facturacion/por-facturar/{id}   → { ..., comprador: { nombre, correoEnmascarado }, lineas: [{ descripcion, cabys: string|null, monto }] }
 *   GET  /api/admin/facturacion/emitidas            → [{ id, numero, negocio, consecutivo, clave, fecha, estado: 'EMITIDA'|'NOTA_CREDITO' }]
 *   POST /api/admin/facturacion/emitidas            multipart { pedidoId, clave (50 díg.), consecutivo (20 díg.), pdf, xml }
 *   GET  /api/admin/facturacion/negocios            → [{ id, numero, negocio, estado: 'PEDIDA'|'RECIBIDA'|'REVISADA'|'CUBIERTA_ACUERDO', archivoUrl }]
 *   GET  /api/admin/facturacion/acuerdos            → [{ negocioId, negocio, conAcuerdo, fecha, documento, documentoUrl }]
 * Por facturar no trae pedidos de /tienda/<slug> ni del POS (lo filtra el backend). El checkout no pide datos fiscales.
 * Sin cédula completa ni IBAN: el comprador llega enmascarado.
 */
export type Linea = { descripcion: string; cabys: string | null; monto: number }
export type PorFacturar = { id: string; numero: string; negocio: string; fecha: string; total: number; estado: 'PAGADO' | 'ENTREGADO'; esteMes: boolean }
export type DetallePorFacturar = PorFacturar & { comprador: { nombre: string; correo: string }; lineas: Linea[] }
export type Emitida = { id: string; numero: string; negocio: string; consecutivo: string; clave: string; fecha: string; estado: 'EMITIDA' | 'NOTA_CREDITO' }
export type FacturaNegocio = { id: string; numero: string; negocio: string; estado: 'PEDIDA' | 'RECIBIDA' | 'REVISADA' | 'CUBIERTA_ACUERDO'; archivoUrl: string | null }
export type Acuerdo = { negocioId: string; negocio: string; conAcuerdo: boolean; fecha: string | null; documento: string | null; documentoUrl: string | null }

const lista = (d: unknown): Record<string, unknown>[] => { const x = d && typeof d === 'object' && 'data' in d ? (d as { data: unknown }).data : d; return Array.isArray(x) ? x : [] }
const obj = (d: unknown) => ((d && typeof d === 'object' && 'data' in d ? (d as { data: unknown }).data : d) ?? {}) as Record<string, unknown>
const t = (v: unknown) => (typeof v === 'string' ? v : '')
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export const aPorFacturar = (x: Record<string, unknown>): PorFacturar => ({ id: String(x.id ?? ''), numero: t(x.numero), negocio: t(x.negocio), fecha: t(x.fecha), total: n(x.total), estado: x.estado === 'ENTREGADO' ? 'ENTREGADO' : 'PAGADO', esteMes: x.esteMes === true })

const base = '/admin/facturacion'
export const facturacionApi = {
  porFacturar: () => api.get(`${base}/por-facturar`).then((r) => lista(r.data).map(aPorFacturar)),
  detalle: (id: string) => api.get(`${base}/por-facturar/${id}`).then((r) => {
    const d = obj(r.data); const c = (d.comprador ?? {}) as Record<string, unknown>
    return { ...aPorFacturar(d), comprador: { nombre: t(c.nombre), correo: t(c.correoEnmascarado) }, lineas: lista(d.lineas).map((l) => ({ descripcion: t(l.descripcion), cabys: typeof l.cabys === 'string' && l.cabys ? l.cabys : null, monto: n(l.monto) })) } as DetallePorFacturar
  }),
  emitidas: () => api.get(`${base}/emitidas`).then((r) => lista(r.data).map((x): Emitida => ({ id: String(x.id ?? ''), numero: t(x.numero), negocio: t(x.negocio), consecutivo: t(x.consecutivo), clave: t(x.clave), fecha: t(x.fecha), estado: x.estado === 'NOTA_CREDITO' ? 'NOTA_CREDITO' : 'EMITIDA' }))),
  registrarEmision: (datos: { pedidoId: string; clave: string; consecutivo: string; pdf: File; xml: File }) => {
    const f = new FormData(); Object.entries(datos).forEach(([k, v]) => f.append(k, v)); return api.post(`${base}/emitidas`, f).then(() => undefined)
  },
  negocios: () => api.get(`${base}/negocios`).then((r) => lista(r.data).map((x): FacturaNegocio => ({ id: String(x.id ?? ''), numero: t(x.numero), negocio: t(x.negocio), estado: (['PEDIDA', 'RECIBIDA', 'REVISADA', 'CUBIERTA_ACUERDO'] as const).find((e) => e === x.estado) ?? 'PEDIDA', archivoUrl: t(x.archivoUrl) || null }))),
  acuerdos: () => api.get(`${base}/acuerdos`).then((r) => lista(r.data).map((x): Acuerdo => ({ negocioId: String(x.negocioId ?? ''), negocio: t(x.negocio), conAcuerdo: x.conAcuerdo === true, fecha: t(x.fecha) || null, documento: t(x.documento) || null, documentoUrl: t(x.documentoUrl) || null }))),
}

/** Texto para pegar en TicoFactura: productos, CABYS, montos y comprador, en ese orden. */
export function datosTicoFactura(d: DetallePorFacturar): string {
  const lineas = d.lineas.map((l) => [l.descripcion, l.cabys ?? '', String(l.monto)].join('\t'))
  return [`Pedido ${d.numero}`, `Comprador\t${d.comprador.nombre}\t${d.comprador.correo}`, 'Producto\tCABYS\tMonto', ...lineas].join('\n')
}

export const validarClave = (c: string) => (/^\d{50}$/.test(c) ? null : 'La clave numérica tiene 50 dígitos.')
export const validarConsecutivo = (c: string) => (/^\d{20}$/.test(c) ? null : 'El consecutivo tiene 20 dígitos.')

/** Chips con contador: [{ id, texto, cantidad }]. */
export function chipsConContador<T>(filas: T[], defs: { id: string; texto: string; filtro: (f: T) => boolean }[]) {
  return [{ id: 'todos', texto: 'Todos', cantidad: filas.length }, ...defs.map((d) => ({ id: d.id, texto: d.texto, cantidad: filas.filter(d.filtro).length }))]
}
