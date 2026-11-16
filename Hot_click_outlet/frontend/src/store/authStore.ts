import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { syncSentryUser } from '@/utils/sentryClient'
import { identifyUser, resetAnalyticsUser } from '@/utils/analytics'
import { ADMIN_ROLES, esUsuarioSistema } from '@/utils/sistemaUser'
import { rolUiDesdeRespuesta, permisosUiDesdeRespuesta } from '@/utils/rolEquipo'
import type { AuthResponse, JwtClaims, RolUsuario } from '@/types/auth'
import type { Id } from '@/types/api'

export { ADMIN_ROLES } from '@/utils/sistemaUser'

type SesionGuardada = {
  token: string | null
  userId: Id | null
  userEmail: string | null
  userRole: RolUsuario | null
  userName: string | null
  empresaId: number | null
  empresaSlug: string | null
  empresaNombre: string | null
  permissions: string[]
  roles: string[]
  rolEquipo?: string | null
  correoVerificado: boolean
}

type AuthState = {
  token: string | null
  userId: Id | null
  userEmail: string | null
  userRole: RolUsuario | null
  userName: string | null
  empresaId: number | null
  empresaSlug: string | null
  empresaNombre: string | null
  permissions: string[]
  roles: string[]
  /** Rol de equipo real (el JWT lleva EMPRENDEDOR para todo miembro). Solo para la UI; el servidor decide por BD. */
  rolEquipo: string | null
  correoVerificado: boolean
  impersonando: boolean
  /** Sesión de soporte: LECTURA por defecto; ESCRITURA tras pedirla con motivo (vence sola). */
  impersonacionModo: ModoImpersonacion | null
  impersonacionEscrituraHasta: number | null
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
  setCorreoVerificado: (verificado: boolean) => void
  logout: () => void
  impersonar: (data: AuthResponse) => void
  salirImpersonacion: () => void
  habilitarEscrituraImpersonacion: (accessToken: string, expiraEn: number | null) => void
}

export type ModoImpersonacion = 'LECTURA' | 'ESCRITURA'

function parseJwtClaims(token: string): JwtClaims {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/'))) as JwtClaims
  } catch {
    return {}
  }
}

// Access JWT (15 min) en localStorage; refresh token solo en cookie HttpOnly.
const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token:        null,
      userId:       null,
      userEmail:    null,
      userRole:     null,
      userName:     null,
      empresaId:     null,
      empresaSlug:   null,
      empresaNombre: null,
      permissions:   [],
      roles:         [],
      rolEquipo:     null,
      correoVerificado: false,
      impersonando:  false,
      impersonacionModo: null,
      impersonacionEscrituraHasta: null,
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
        // El rol Spring del JWT es EMPRENDEDOR para todo miembro; la UI ramifica por el rol de equipo (CAJERO → solo POS).
        const rolEquipo   = data.rolEquipo ?? null
        const permissions = permisosUiDesdeRespuesta(data, claims.permisos)
        const rol         = rolUiDesdeRespuesta(data.rol ?? claims.rol ?? null, rolEquipo)

        set({
          token:        data.accessToken,
          userId:       data.id ?? null,
          userEmail:    data.correo ?? null,
          userRole:     rol,
          userName:     data.nombre ?? data.correo?.split('@')[0] ?? null,
          empresaId:    empresaId   ? Number(empresaId) : null,
          empresaSlug:  empresaSlug || null,
          empresaNombre: data.empresaNombre ?? null,
          permissions:  Array.isArray(permissions) ? permissions : [],
          roles:        rol ? [rol] : [],
          rolEquipo,
          correoVerificado: data.correoVerificado === true,
          impersonando:  false,
          impersonacionModo: null,
          impersonacionEscrituraHasta: null,
          adminOriginal: null,
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

      setCorreoVerificado: (verificado) => set({ correoVerificado: verificado }),

      logout: () => {
        resetAnalyticsUser()
        syncSentryUser()
        set({
          token:        null,
          userId:       null,
          userEmail:    null,
          userRole:     null,
          userName:     null,
          empresaId:    null,
          empresaSlug:  null,
          empresaNombre: null,
          permissions:  [],
          roles:        [],
          rolEquipo:    null,
          correoVerificado: false,
          impersonando:  false,
          impersonacionModo: null,
          impersonacionEscrituraHasta: null,
          adminOriginal: null,
        })
      },

      impersonar: (data) => {
        const state = get()
        const adminOriginal: SesionGuardada = {
          token: state.token, userId: state.userId,
          userEmail: state.userEmail, userRole: state.userRole, userName: state.userName,
          empresaId: state.empresaId, empresaSlug: state.empresaSlug, empresaNombre: state.empresaNombre,
          permissions: state.permissions, roles: state.roles, rolEquipo: state.rolEquipo,
          correoVerificado: state.correoVerificado,
        }
        const permissions = data.permisos ?? []
        const rol = data.rol ?? 'EMPRENDEDOR'
        set({
          adminOriginal,
          impersonando:  true,
          impersonacionModo: data.modo === 'ESCRITURA' ? 'ESCRITURA' : 'LECTURA',
          impersonacionEscrituraHasta: null,
          token:         data.accessToken,
          userId:        state.userId,
          userEmail:     state.userEmail,
          userName:      state.userName,
          userRole:      rol,
          empresaId:     data.empresaId   ? Number(data.empresaId)   : null,
          empresaSlug:   data.empresaSlug || null,
          empresaNombre: data.empresaNombre ?? null,
          permissions:   Array.isArray(permissions) ? permissions : [],
          roles:         rol ? [rol] : [],
          rolEquipo:     null,
        })
      },

      salirImpersonacion: () => {
        const original = get().adminOriginal
        if (!original) return
        set({ ...original, impersonando: false, impersonacionModo: null,
          impersonacionEscrituraHasta: null, adminOriginal: null })
      },

      habilitarEscrituraImpersonacion: (accessToken, expiraEn) => {
        if (!get().impersonando) return
        set({ token: accessToken, impersonacionModo: 'ESCRITURA', impersonacionEscrituraHasta: expiraEn })
      },
    }),
    {
      name: 'hotclick-auth',
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        userEmail: state.userEmail,
        userRole: state.userRole,
        userName: state.userName,
        empresaId: state.empresaId,
        empresaSlug: state.empresaSlug,
        empresaNombre: state.empresaNombre,
        permissions: state.permissions,
        roles: state.roles,
        rolEquipo: state.rolEquipo,
        correoVerificado: state.correoVerificado,
        impersonando: state.impersonando,
        impersonacionModo: state.impersonacionModo,
        impersonacionEscrituraHasta: state.impersonacionEscrituraHasta,
        adminOriginal: state.adminOriginal,
      }),
    }
  )
)

export default useAuthStore
