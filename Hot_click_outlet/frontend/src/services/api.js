import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token from Zustand store
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('hotclick-auth')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`
    }
  } catch {}
  return config
})

// Auto-unwrap ResponseDTO { success, message, data } transparently.
// Responses without that shape (JwtResponse, plain Maps) pass through unchanged.
api.interceptors.response.use(
  (response) => {
    const d = response.data
    if (d && 'success' in d && 'data' in d && d.data !== undefined && d.data !== null) {
      response.data = d.data
    }
    return response
  },
  (error) => {
    const status = error.response?.status
    // 401 = token expirado/inválido; 403 sin token = sesión perdida → redirigir al login
    if (status === 401) {
      localStorage.removeItem('hotclick-auth')
      window.location.href = '/login'
    } else if (status === 403) {
      const stored = localStorage.getItem('hotclick-auth')
      const hasToken = (() => { try { return !!JSON.parse(stored)?.state?.token } catch { return false } })()
      if (!hasToken) {
        localStorage.removeItem('hotclick-auth')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
