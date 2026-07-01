import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const ADMIN_ROLES = new Set(['ADMIN', 'EMPRENDEDOR'])

// Extrae los claims del JWT sin verificar firma (solo lectura en cliente)
function parseJwtClaims(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/')))
  } catch {
    return {}
  }
}

// AuthResponse: { accessToken, refreshToken, tipo, id, correo, rol, nombre, empresaId, empresaSlug, permisos }
const useAuthStore = create(
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

      isAuthenticated: () => !!get().token,
      isAdmin:         () => ADMIN_ROLES.has(get().userRole),
      isEmprendedor:   () => get().userRole === 'EMPRENDEDOR',
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
          userId:       data.id,
          userEmail:    data.correo,
          userRole:     rol,
          userName:     data.nombre ?? data.correo?.split('@')[0],
          empresaId:    empresaId   ? Number(empresaId) : null,
          empresaSlug:  empresaSlug || null,
          empresaNombre: data.empresaNombre ?? null,
          permissions:  Array.isArray(permissions) ? permissions : [],
          roles:        rol ? [rol] : [],
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

      logout: () => set({
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
      }),
    }),
    { name: 'hotclick-auth' }
  )
)

export default useAuthStore
