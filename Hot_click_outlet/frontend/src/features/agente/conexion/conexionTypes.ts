export interface ConfigConexion {
  whatsappDisponible: boolean
  metaLoginDisponible: boolean
  appId: string
  whatsappConfigId: string
  loginConfigId: string
  graphVersion: string
}

export interface CuentaConectada {
  id: number
  tipo: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER'
  nombre: string | null
  estado: string
}

export interface ResultadoConexion {
  cuentas: CuentaConectada[]
  avisos: string[]
}

export interface PaginaMeta {
  id: string
  nombre: string
  instagramId: string | null
  instagramUsuario: string | null
}

export interface SesionWhatsapp {
  code: string
  phoneNumberId: string
  wabaId: string
}
