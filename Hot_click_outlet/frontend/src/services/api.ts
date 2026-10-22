import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import useAuthStore from '@/store/authStore'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import type { AuthPersistido } from '@/types/auth'
import type { ResponseDTO } from '@/types/api'
import { quitarContentTypeSiFormData } from './apiMultipart'

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // cookie HttpOnly hotclick_refresh en /api/auth/refresh
})

const getStored = (): AuthPersistido => {
  try {
    const raw = localStorage.getItem('hotclick-auth')
    const parsed = raw ? JSON.parse(raw) as { state?: AuthPersistido } : null
    return parsed?.state ?? {}
  } catch { return {} }
}

// Adjunta access token a cada request
api.interceptors.request.use((config) => {
  const { token } = getStored()
  if (token) config.headers.Authorization = `Bearer ${token}`
  quitarContentTypeSiFormData(config.headers, config.data)
  return config
})

const esRefresh = (url?: string) => !!url && url.includes('/auth/refresh')

// Single-flight: los 401 concurrentes comparten UNA sola llamada a /auth/refresh,
// así la rotación del refresh token no detecta un falso "reuso" y revoca la familia.
let refreshEnCurso: Promise<string | null> | null = null

export function refrescarUnaVez(): Promise<string | null> {
  if (!refreshEnCurso) {
    refreshEnCurso = axios
      .post<{ accessToken?: string }>('/api/auth/refresh', {}, { withCredentials: true })
      .then(({ data }) => {
        if (!data?.accessToken) return null
        useAuthStore.getState().updateAccessToken(data.accessToken)
        cierreHecho = false
        return data.accessToken
      })
      .catch(() => null)
      .finally(() => { refreshEnCurso = null })
  }
  return refreshEnCurso
}

// Logout una sola vez aunque fallen varios requests a la vez.
let cierreHecho = false
function cerrarSesionUnaVez(hadSession: boolean) {
  if (cierreHecho) return
  cierreHecho = true
  localStorage.removeItem('hotclick-auth')
  if (hadSession) {
    const dest = `${globalThis.location.pathname}${globalThis.location.search}`
    globalThis.location.href = rutaLoginConRetorno(dest)
  }
}

/** Solo para tests. */
export function __resetAuthRefreshParaTests() { refreshEnCurso = null; cierreHecho = false }

// Auto-unwrap ResponseDTO { success, message, data }
// Responses sin ese shape (AuthResponse, Maps) pasan sin cambios
api.interceptors.response.use(
  (response) => {
    const d = response.data as ResponseDTO<unknown> | unknown
    if (d && typeof d === 'object' && 'success' in d && 'data' in d) {
      const envelope = d as ResponseDTO<unknown>
      if (envelope.data !== undefined && envelope.data !== null) {
        response.data = envelope.data
      }
    }
    return response
  },
  async (error: AxiosError<{ accessToken?: string }>) => {
    const status   = error.response?.status
    const original = error.config as RetryConfig | undefined

    // Renueva el access token con la cookie HttpOnly (no localStorage).
    // No reintenta el propio /auth/refresh para evitar bucles.
    if (status === 401 && original && !original._retry && !esRefresh(original.url)) {
      original._retry = true
      const hadSession = !!getStored().token
      const token = await refrescarUnaVez()
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
      cerrarSesionUnaVez(hadSession)
    }

    return Promise.reject(error)
  }
)

export function registrarConsentimiento(tipo: string) {
  return api.post('/consentimiento', { tipo }).catch((err: unknown) => {
    console.error('[api] consentimiento', err)
  })
}

export default api
