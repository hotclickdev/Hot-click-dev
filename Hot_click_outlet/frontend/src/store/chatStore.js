import { create } from 'zustand'

const INACTIVITY_MS = 10 * 60 * 1000
let _interval = null

const useChatStore = create((set, get) => ({
  isOpen: false,
  pendingMessage: null,

  mensajes: [],
  sesionId: null,
  lastActivity: null,

  open: (message = null) => set({ isOpen: true, pendingMessage: message }),
  close: () => set({ isOpen: false }),
  clearPending: () => set({ pendingMessage: null }),

  setMensajes: (updater) => {
    const current = get().mensajes
    const next = typeof updater === 'function' ? updater(current) : updater
    set({ mensajes: next, lastActivity: Date.now() })
  },

  setSesionId: (id) => set({ sesionId: id }),

  resetSession: () => set({ mensajes: [], sesionId: null, lastActivity: null }),

  checkExpiry: () => {
    const { lastActivity, mensajes } = get()
    if (mensajes.length > 0 && lastActivity && Date.now() - lastActivity > INACTIVITY_MS) {
      set({ mensajes: [], sesionId: null, lastActivity: null })
      try {
        sessionStorage.removeItem('hc-chat-msgs-hotclick')
      } catch (err) {
        console.error(err)
      }
    }
  },

  startExpiryTimer: () => {
    if (_interval) return
    _interval = setInterval(() => get().checkExpiry(), 60_000)
  },

  stopExpiryTimer: () => {
    clearInterval(_interval)
    _interval = null
  },
}))

export default useChatStore
