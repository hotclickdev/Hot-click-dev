import { create } from 'zustand'

const INACTIVITY_MS = 5 * 60 * 1000 // 5 minutos

const useChatStore = create((set, get) => ({
  isOpen: false,
  pendingMessage: null,
  mensajes: [],
  lastActivity: null,

  open: (message = null) => set({ isOpen: true, pendingMessage: message }),
  close: () => set({ isOpen: false }),
  clearPending: () => set({ pendingMessage: null }),

  setMensajes: (updater) => {
    const current = get().mensajes
    const next = typeof updater === 'function' ? updater(current) : updater
    set({ mensajes: next, lastActivity: Date.now() })
  },

  // Limpia la conversación si pasaron más de 5 minutos de inactividad
  checkExpiry: () => {
    const { lastActivity, mensajes } = get()
    if (mensajes.length > 0 && lastActivity && Date.now() - lastActivity > INACTIVITY_MS) {
      set({ mensajes: [], lastActivity: null })
    }
  },
}))

export default useChatStore
