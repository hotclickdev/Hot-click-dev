/** Identificador de recurso: el backend usa Long; el front a veces lo trata como string. */
export type Id = number | string

/** Cuerpo JSON de un POST/PUT cuyo DTO detallado vive en el backend. */
export type JsonBody = Record<string, unknown>

/** Envelope estándar del backend antes del unwrap en el interceptor de Axios. */
export type ResponseDTO<T> = {
  success?: boolean
  message?: string
  data: T
}

/** Página Spring Data que llega tras el unwrap. */
export type Pagina<T> = {
  content: T[]
  totalElements?: number
  totalPages?: number
  number?: number
  size?: number
  first?: boolean
  last?: boolean
}

export type AxiosParams = Record<string, string | number | boolean | undefined | null>
