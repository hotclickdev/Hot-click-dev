import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

const getStored = () => {
  try {
    const raw = localStorage.getItem('hotclick-auth')
    return raw ? JSON.parse(raw)?.state ?? {} : {}
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
    const d = response.data
    if (d && 'success' in d && 'data' in d && d.data !== undefined && d.data !== null) {
      response.data = d.data
    }
    return response
  },
  async (error) => {
    const status   = error.response?.status
    const original = error.config

    // Intenta renovar el access token con el refresh token antes de redirigir
    if (status === 401 && !original._retry) {
      original._retry = true
      const stored = getStored()
      const hadSession = !!stored.token || !!stored.refreshToken

      if (stored.refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken: stored.refreshToken })
          if (data?.accessToken) {
            // Actualizar solo el access token en el store sin perder el resto del estado
            const raw = localStorage.getItem('hotclick-auth')
            if (raw) {
              const parsed = JSON.parse(raw)
              parsed.state.token = data.accessToken
              localStorage.setItem('hotclick-auth', JSON.stringify(parsed))
            }
            original.headers.Authorization = `Bearer ${data.accessToken}`
            return api(original) // reintentar request original
          }
        } catch {
          // Refresh falló → logout completo
        }
      }

      localStorage.removeItem('hotclick-auth')
      // Solo redirigir a login si el usuario tenía una sesión activa que expiró
      if (hadSession) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
