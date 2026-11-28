import api from './api'

/** Contador IA de la consola de plataforma. Solo ADMIN y nunca impersonando (el servidor lo vuelve a validar). */

export type Progreso = { valor: number; tope: number; pct: number; superado: boolean; restante: number }

export type Evento = {
  clave: string
  tipo: string
  titulo: string
  detalle: string
  fecha: string
  fechaNominal: string
  corridoPorFinDeSemana: boolean
  diasRestantes: number
  verificar: boolean
}

export type Trimestre = {
  anio: number
  trimestre: number
  compras: number
  cuotaIva: number | null
  cuotaRenta: number | null
  cuotaTotal: number | null
  mensaje: string | null
}

export type IvaMes = {
  periodo: string
  ventasBase: number
  ivaVentas: number
  comprasConCredito: number
  comprasSinCredito: number
  ivaAcreditable: number
  ivaAPagar: number
  saldoAFavor: number
  recargoPct: number
  recargoCobrado: number | null
  recargoCubreIvaPct: number | null
}

export type RtsMes = {
  comprasAnio: number
  salarioBaseCrc: number
  progresoTope: Progreso
  trimestreADeclarar: Trimestre
  trimestreEnCurso: Trimestre
  formulario: string
}

export type Renta = {
  ingresosBrutosAnio: number
  umbral: number
  progreso: Progreso
  tipoPersona: string
  tasaSobreUmbralPct: string
  tramos: string
  tramosDetalle: Array<{ hasta: number | null; tasaPct: number }>
  periodoFiscal: string
  superaUmbral: boolean
}

export type EsteMes = {
  regimen: 'SIMPLIFICADO' | 'TRADICIONAL'
  hoy: string
  anio: number
  avisoLegal: string
  comprasConDatos: boolean
  iva?: IvaMes
  rts?: RtsMes
  proximoVencimiento: Evento | null
  renta: Renta
  etiquetaVerificar: string
}

export type Caja = { id: string; etiqueta: string; valor: number | null; nota: string }

export type Borrador = {
  tipo: 'IVA_150' | 'RTS_TRIMESTRAL'
  periodo: string
  formulario?: string
  cajas: Caja[]
  mensaje?: string | null
  avisos: string[]
}

export type Vendedor = 'INSCRITO' | 'RTS' | 'NO_INSCRITO'

export type Calculadora = {
  precio: number
  vendedor: Vendedor
  daCredito: boolean
  ivaSinCredito: number
  ivaConCredito: number
  ivaEfectivo: number
  recargoRecomendadoPct: number
  recargoActualPct: number
  diferenciaPuntos: number
  recargoCubre: boolean
  notas: string[]
}

export type Confianza = 'Seguro' | 'Verificar' | 'No sé'

export type RespuestaChat = {
  estado: string
  respuesta: string
  fuente: string | null
  confianza: Confianza
  restantesHoy: number
}

export type Ajustes = {
  salarioBaseCrc: number
  topeIaMesUsd: number
  limitePreguntasDia: number
  topeAnualRtsCrc: number
  parametros: Record<string, string>
  etiquetaVerificar: string
  avisoLegal: string
}

export type ConsultaHacienda = { clave: string; titulo: string; resumen: string; estado: 'ABIERTA' | 'CONFIRMADA'; aviso: string }

export type BorradorHacienda = { clave: string; titulo: string; aviso: string; texto: string }

export type DocumentoNormativa = { id: number; titulo: string; fuente: string; caracteres: number; creadoEn: string }

/** Desenvuelve el ResponseDTO ({ success, message, data }). */
export function datos<T>(respuesta: { data: unknown }): T {
  const cuerpo = respuesta.data as { data?: unknown } | undefined
  return ((cuerpo && typeof cuerpo === 'object' && 'data' in cuerpo ? cuerpo.data : cuerpo) ?? null) as T
}

const BASE = '/admin/contador'

export const contadorService = {
  esteMes: () => api.get(`${BASE}/este-mes`),
  calendario: () => api.get(`${BASE}/calendario`),
  borradorIva: (anio?: number, mes?: number) => api.get(`${BASE}/borrador/iva`, { params: anio && mes ? { anio, mes } : {} }),
  borradorRts: (anio?: number, trimestre?: number) =>
    api.get(`${BASE}/borrador/rts`, { params: anio && trimestre ? { anio, trimestre } : {} }),
  calculadora: (precio: number, vendedor: Vendedor, margenPct?: number) =>
    api.get(`${BASE}/calculadora`, { params: { precio, vendedor, ...(margenPct != null ? { margenPct } : {}) } }),
  preguntar: (pregunta: string) => api.post(`${BASE}/preguntar`, { pregunta }),
  ajustes: () => api.get(`${BASE}/ajustes`),
  guardarAjustes: (a: { salarioBaseCrc: number; topeIaMesUsd: number; limitePreguntasDia: number }) => api.put(`${BASE}/ajustes`, a),
  guardarParametros: (parametros: Record<string, string>) => api.put(`${BASE}/parametros`, { parametros }),
  normativa: () => api.get(`${BASE}/normativa`),
  agregarNormativa: (d: { titulo: string; fuente: string; texto: string }) => api.post(`${BASE}/normativa`, d),
  hacienda: () => api.get(`${BASE}/hacienda`),
  borradorHacienda: (clave: string) => api.get(`${BASE}/hacienda/${encodeURIComponent(clave)}/borrador`),
  marcarHacienda: (clave: string, confirmada: boolean) => api.put(`${BASE}/hacienda/${encodeURIComponent(clave)}`, { confirmada }),
  avisos: () => api.get(`${BASE}/avisos`),
  avisoLeido: (id: number) => api.post(`${BASE}/avisos/${id}/leido`),
}
