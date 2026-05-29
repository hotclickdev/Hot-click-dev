import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Extrae los claims del JWT sin verificar firma (solo lectura en cliente)
function parseJwtClaims(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return {}
  }
}

// AuthResponse: { accessToken, refreshToken, tipo, id, correo, rol, nombre, empresaId, empresaSlug }
const useAuthStore = create(
  persist(
    (set, get) => ({
      token:        null,   // access token (15 min)
      refreshToken: null,   // refresh token (30 días)
      userId:       null,
      userEmail:    null,
      userRole:     null,
      userName:     null,
      empresaId:     null,   // tenant del usuario autenticado
      empresaSlug:   null,   // slug de la empresa (ej: "hot-store")
      empresaNombre: null,   // nombre visible en sidebar

      isAuthenticated: () => !!get().token,
      isAdmin:         () => ['ADMIN_IT', 'ADMIN_CLIENTE', 'EMPRENDEDOR'].includes(get().userRole),
      isAdminIT:       () => get().userRole === 'ADMIN_IT',
      isEmprendedor:   () => get().userRole === 'EMPRENDEDOR',
      isAdminCliente:  () => get().userRole === 'ADMIN_CLIENTE',
      isUsuarioFinal:  () => get().userRole === 'USUARIO_FINAL',

      login: (data) => {
        // Leer empresaId/empresaSlug del response o del token directamente
        const claims     = parseJwtClaims(data.accessToken)
        const empresaId   = data.empresaId   ?? claims.empresaId   ?? null
        const empresaSlug = data.empresaSlug ?? claims.empresaSlug ?? null

        set({
          token:        data.accessToken,
          refreshToken: data.refreshToken ?? null,
          userId:       data.id,
          userEmail:    data.correo,
          userRole:     data.rol,
          userName:     data.nombre ?? data.correo?.split('@')[0],
          empresaId:     empresaId   ? Number(empresaId) : null,
          empresaSlug:   empresaSlug || null,
          empresaNombre: data.empresaNombre ?? null,
        })
      },

      updateAccessToken: (accessToken) => {
        // Al refrescar el token también actualizamos los claims de empresa
        const claims = parseJwtClaims(accessToken)
        set({
          token:       accessToken,
          empresaId:   claims.empresaId   ? Number(claims.empresaId)   : get().empresaId,
          empresaSlug: claims.empresaSlug ? claims.empresaSlug         : get().empresaSlug,
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
        empresaId:     null,
        empresaSlug:   null,
        empresaNombre: null,
      }),
    }),
    { name: 'hotclick-auth' }
  )
)

export default useAuthStore
