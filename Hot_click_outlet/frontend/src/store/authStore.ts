import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { syncSentryUser } from '@/utils/sentryClient'
import { identifyUser, resetAnalyticsUser } from '@/utils/analytics'
import { ADMIN_ROLES, esUsuarioSistema } from '@/utils/sistemaUser'
import type { AuthResponse, JwtClaims, RolUsuario } from '@/types/auth'
import type { Id } from '@/types/api'

export { ADMIN_ROLES } from '@/utils/sistemaUser'

type SesionGuardada = {
  token: string | null
  refreshToken: string | null
  userId: Id | null
  userEmail: string | null
  userRole: RolUsuario | null
  userName: string | null
  empresaId: number | null
  empresaSlug: string | null
  empresaNombre: string | null
  permissions: string[]
  roles: string[]
}

type AuthState = {
  token: string | null
  refreshToken: string | null
  userId: Id | null
  userEmail: string | null
  userRole: RolUsuario | null
  userName: string | null
  empresaId: number | null
  empresaSlug: string | null
  empresaNombre: string | null
  permissions: string[]
  roles: string[]
  impersonando: boolean
  adminOriginal: SesionGuardada | null
  isAuthenticated: () => boolean
  isAdmin: () => boolean
  isEmprendedor: () => boolean
  isUsuarioFinal: () => boolean
  hasPermission: (perm: string) => boolean
  hasAnyRole: (...rols: string[]) => boolean
  login: (data: AuthResponse) => void
  updateAccessToken: (accessToken: string) => void
  setUserName: (nombre: string) => void
  logout: () => void
  impersonar: (data: AuthResponse) => void
  salirImpersonacion: () => void
}

// Extrae los claims del JWT sin verificar firma (solo lectura en cliente)
function parseJwtClaims(token: string): JwtClaims {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/'))) as JwtClaims
  } catch {
    return {}
  }
}

// AuthResponse: { accessToken, refreshToken, tipo, id, correo, rol, nombre, empresaId, empresaSlug, permisos }
const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token:        null,   // access token (15 min)
      refreshToken: null,   // refresh token (30 días)
      userId:       null,
      userEmail:    null,
      userRole:     null,
      userName:     null,
      empresaId:     null,
      empresaSlug:   null,
      empresaNombre: null,
      permissions:   [],    // permisos granulares: ['pos.usar', 'products.view', ...]
      roles:         [],    // roles: ['CAJERO', 'EMPRENDEDOR', ...]
      impersonando:  false,
      adminOriginal: null,

      isAuthenticated: () => !!get().token,
      isAdmin:         () => ADMIN_ROLES.has(get().userRole ?? ''),
      isEmprendedor:   () => esUsuarioSistema(get().userRole),
      isUsuarioFinal:  () => get().userRole === 'USUARIO_FINAL',
      hasPermission:   (perm) => get().permissions.includes(perm),
      hasAnyRole:      (...rols) => rols.some(r => get().roles.includes(r)),

      login: (data) => {
        const claims      = parseJwtClaims(data.accessToken)
        const empresaId   = data.empresaId   ?? claims.empresaId   ?? null
        const empresaSlug = data.empresaSlug ?? claims.empresaSlug ?? null
        // Permisos: primero del response body, luego del JWT como fallback
        const permissions = data.permisos ?? claims.permisos ?? []
        const rol         = data.rol ?? claims.rol ?? null

        set({
          token:        data.accessToken,
          refreshToken: data.refreshToken ?? null,
          userId:       data.id ?? null,
          userEmail:    data.correo ?? null,
          userRole:     rol,
          userName:     data.nombre ?? data.correo?.split('@')[0] ?? null,
          empresaId:    empresaId   ? Number(empresaId) : null,
          empresaSlug:  empresaSlug || null,
          empresaNombre: data.empresaNombre ?? null,
          permissions:  Array.isArray(permissions) ? permissions : [],
          roles:        rol ? [rol] : [],
        })
        syncSentryUser({
          userId: data.id,
          empresaId: empresaId ? Number(empresaId) : null,
          rol,
        })
        identifyUser({
          userId: data.id,
          rol,
          empresaId: empresaId ? Number(empresaId) : null,
        })
      },

      updateAccessToken: (accessToken) => {
        const claims = parseJwtClaims(accessToken)
        set({
          token:        accessToken,
          empresaId:    claims.empresaId   ? Number(claims.empresaId)   : get().empresaId,
          empresaSlug:  claims.empresaSlug ? claims.empresaSlug         : get().empresaSlug,
          permissions:  Array.isArray(claims.permisos) ? claims.permisos : get().permissions,
        })
      },

      setUserName: (nombre) => set({ userName: nombre }),

      logout: () => {
        resetAnalyticsUser()
        syncSentryUser()
        set({
          token:        null,
          refreshToken: null,
          userId:       null,
          userEmail:    null,
          userRole:     null,
          userName:     null,
          empresaId:    null,
          empresaSlug:  null,
          empresaNombre: null,
          permissions:  [],
          roles:        [],
        })
      },

      // Guarda la sesión ADMIN actual y adopta la del usuario objetivo.
      impersonar: (data) => {
        const state = get()
        const adminOriginal: SesionGuardada = {
          token: state.token, refreshToken: state.refreshToken, userId: state.userId,
          userEmail: state.userEmail, userRole: state.userRole, userName: state.userName,
          empresaId: state.empresaId, empresaSlug: state.empresaSlug, empresaNombre: state.empresaNombre,
          permissions: state.permissions, roles: state.roles,
        }
        const permissions = data.permisos ?? []
        set({
          adminOriginal,
          impersonando:  true,
          token:         data.accessToken,
          // Sin refresh token propio: el token de impersonación expira solo (30 min) y
          // no debe poder renovarse con el refresh token del ADMIN guardado en adminOriginal
          // (si no, un 401 durante la impersonación revertiría la sesión en silencio).
          refreshToken:  null,
          userId:        data.id ?? null,
          userEmail:     data.correo ?? null,
          userRole:      data.rol ?? null,
          userName:      data.nombre ?? data.correo?.split('@')[0] ?? null,
          empresaId:     data.empresaId   ? Number(data.empresaId)   : null,
          empresaSlug:   data.empresaSlug || null,
          empresaNombre: data.empresaNombre ?? null,
          permissions:   Array.isArray(permissions) ? permissions : [],
          roles:         data.rol ? [data.rol] : [],
        })
      },

      // Restaura la sesión ADMIN guardada antes de impersonar.
      salirImpersonacion: () => {
        const original = get().adminOriginal
        if (!original) return
        set({ ...original, impersonando: false, adminOriginal: null })
      },
    }),
    { name: 'hotclick-auth' }
  )
)

export default useAuthStore
