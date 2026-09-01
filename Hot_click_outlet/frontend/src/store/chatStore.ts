import { create } from 'zustand'

const INACTIVITY_MS = 10 * 60 * 1000
let _interval: ReturnType<typeof setInterval> | null = null

export type ChatMensaje = {
  rol?: string
  texto?: string
  [key: string]: unknown
}

type ChatState = {
  isOpen: boolean
  pendingMessage: string | null
  mensajes: ChatMensaje[]
  sesionId: string | null
  lastActivity: number | null
  open: (message?: string | null) => void
  close: () => void
  clearPending: () => void
  setMensajes: (updater: ChatMensaje[] | ((current: ChatMensaje[]) => ChatMensaje[])) => void
  setSesionId: (id: string | null) => void
  resetSession: () => void
  checkExpiry: () => void
  startExpiryTimer: () => void
  stopExpiryTimer: () => void
}

const useChatStore = create<ChatState>((set, get) => ({
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
        sessionStorage.removeItem('hc-chat-msgs-tienda-home')
        sessionStorage.removeItem('hc-chat-msgs-tienda-catalogo')
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
    if (_interval) clearInterval(_interval)
    _interval = null
  },
}))

export default useChatStore
