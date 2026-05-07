import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Backend JwtResponse: { token, tipo, id, correo, rol }
const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      userId: null,
      userEmail: null,
      userRole: null,
      userName: null,

      isAuthenticated: () => !!get().token,
      isAdmin: () => ['ADMIN_IT', 'ADMIN_CLIENTE'].includes(get().userRole),
      isAdminIT: () => get().userRole === 'ADMIN_IT',

      login: (data) => set({
        token: data.token,
        userId: data.id,
        userEmail: data.correo,
        userRole: data.rol,
        userName: data.correo?.split('@')[0],
      }),

      setUserName: (nombre) => set({ userName: nombre }),

      logout: () => set({
        token: null,
        userId: null,
        userEmail: null,
        userRole: null,
        userName: null,
      }),
    }),
    { name: 'hotclick-auth' }
  )
)

export default useAuthStore
