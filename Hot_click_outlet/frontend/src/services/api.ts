import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import useAuthStore from '@/store/authStore'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import type { AuthPersistido } from '@/types/auth'
import type { ResponseDTO } from '@/types/api'

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
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
  return config
})

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

    // Intenta renovar el access token con el refresh token antes de redirigir
    if (status === 401 && original && !original._retry) {
      original._retry = true
      const stored = getStored()
      const hadSession = !!stored.token || !!stored.refreshToken

      if (stored.refreshToken) {
        try {
          const { data } = await axios.post<{ accessToken?: string }>('/api/auth/refresh', { refreshToken: stored.refreshToken })
          if (data?.accessToken) {
            // Sync Zustand in-memory state first, then let persist middleware update localStorage
            useAuthStore.getState().updateAccessToken(data.accessToken)
            original.headers.Authorization = `Bearer ${data.accessToken}`
            return api(original) // reintentar request original
          }
        } catch {
          // Refresh falló → logout completo
        }
      }

      localStorage.removeItem('hotclick-auth')
      if (hadSession) {
        const dest = `${globalThis.location.pathname}${globalThis.location.search}`
        globalThis.location.href = rutaLoginConRetorno(dest)
      }
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
