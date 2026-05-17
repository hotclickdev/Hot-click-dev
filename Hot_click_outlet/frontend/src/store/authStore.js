import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// AuthResponse: { accessToken, refreshToken, tipo, id, correo, rol, nombre }
const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,        // access token (15 min)
      refreshToken: null, // refresh token (30 días)
      userId: null,
      userEmail: null,
      userRole: null,
      userName: null,

      isAuthenticated: () => !!get().token,
      isAdmin: () => ['ADMIN_IT', 'ADMIN_CLIENTE'].includes(get().userRole),
      isAdminIT: () => get().userRole === 'ADMIN_IT',

      login: (data) => set({
        token:        data.accessToken,
        refreshToken: data.refreshToken ?? null,
        userId:       data.id,
        userEmail:    data.correo,
        userRole:     data.rol,
        userName:     data.nombre ?? data.correo?.split('@')[0],
      }),

      updateAccessToken: (accessToken) => set({ token: accessToken }),

      setUserName: (nombre) => set({ userName: nombre }),

      logout: () => set({
        token:        null,
        refreshToken: null,
        userId:       null,
        userEmail:    null,
        userRole:     null,
        userName:     null,
      }),
    }),
    { name: 'hotclick-auth' }
  )
)

export default useAuthStore
