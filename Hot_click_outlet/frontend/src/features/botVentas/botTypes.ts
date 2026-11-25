export type DiaSemana = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO'

export const DIAS: DiaSemana[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

export type DiaHorario = { dia: DiaSemana; abierto: boolean; desde: string; hasta: string }

export type Trato = 'USTED' | 'TUTEO'

export type ConfigBot = {
  nombreBot: string
  trato: Trato
  emojis: boolean
  activo: boolean
  horarioActivo: boolean
  horario: DiaHorario[]
  mensajeFueraHorario: string | null
  zona: string
}

export type PedidoConfigBot = Omit<ConfigBot, 'zona'>

export type Conocimiento = {
  id: number
  titulo: string
  contenido: string
  categoria: string | null
  activo: boolean
}

export type PedidoConocimiento = {
  titulo: string
  contenido: string
  categoria: string | null
  activo: boolean
}

export type CanalBot = {
  id: number
  tipo: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER'
  nombre: string | null
  estado: string
  tieneToken: boolean
}

export type EstadoVinculacion = {
  vinculado: boolean
  telefonoTerminaEn: string | null
  tienePin: boolean
  fechaVinculacion: string | null
}

export type CodigoVinculacion = {
  codigo: string
  expiraEnMin: number
  canalNombre: string | null
  instruccion: string
}

export type MiembroVinculado = {
  usuarioId: number
  telefonoTerminaEn: string | null
  fechaVinculacion: string | null
}

export type TurnoSimulador = { rol: 'usuario' | 'bot'; texto: string }

export type ResultadoSimulador = {
  texto: string
  pasoAPersona: boolean
  motivoFin: string
  tokensEntrada: number
  tokensSalida: number
}

export type TipoLead = 'COMPRADOR' | 'NEGOCIO'
export type EstadoLead = 'NUEVO' | 'CONTACTADO' | 'CONVERTIDO' | 'DESCARTADO'

export type Lead = {
  id: number
  tipo: TipoLead
  canal: string | null
  contactoEnmascarado: string | null
  contacto?: string | null
  nombre: string | null
  tipoNegocio: string | null
  interes: string | null
  estado: EstadoLead
  creadoEn: string
}

/** Uso del mes del bot. cupo: -1 = ilimitado, null = sin cupo. */
export type UsoBot = {
  mes: string
  conversaciones: number
  cupo: number | null
  costoUsd: number
  topeUsd: number | null
  agenteIncluido: boolean
}
