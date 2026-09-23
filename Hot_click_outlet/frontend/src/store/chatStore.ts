import { create } from 'zustand'

const INACTIVITY_MS = 20 * 60 * 1000
const MSG_PREFIX = 'hc-chat-msgs-'
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
  resetCount: number
  open: (message?: string | null) => void
  close: () => void
  clearPending: () => void
  setMensajes: (updater: ChatMensaje[] | ((current: ChatMensaje[]) => ChatMensaje[])) => void
  touchActivity: () => void
  setSesionId: (id: string | null) => void
  resetSession: () => void
  clearConversation: () => void
  checkExpiry: () => void
  startExpiryTimer: () => void
  stopExpiryTimer: () => void
}

function clearChatStorageKeys() {
  try {
    const storages: Storage[] = [sessionStorage, localStorage]
    for (const store of storages) {
      const keys: string[] = []
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i)
        if (key?.startsWith(MSG_PREFIX)) keys.push(key)
      }
      for (const key of keys) store.removeItem(key)
    }
  } catch (err) {
    console.error(err)
  }
}

const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  pendingMessage: null,

  mensajes: [],
  sesionId: null,
  lastActivity: null,
  resetCount: 0,

  open: (message = null) => set({ isOpen: true, pendingMessage: message }),
  close: () => set({ isOpen: false }),
  clearPending: () => set({ pendingMessage: null }),

  setMensajes: (updater) => {
    const current = get().mensajes
    const next = typeof updater === 'function' ? updater(current) : updater
    set({ mensajes: next, lastActivity: Date.now() })
  },

  touchActivity: () => set({ lastActivity: Date.now() }),

  setSesionId: (id) => set({ sesionId: id }),

  resetSession: () => set({ mensajes: [], sesionId: null, lastActivity: null }),

  clearConversation: () => {
    clearChatStorageKeys()
    set(s => ({
      mensajes: [],
      sesionId: null,
      lastActivity: null,
      resetCount: s.resetCount + 1,
    }))
  },

  checkExpiry: () => {
    const { lastActivity } = get()
    if (lastActivity && Date.now() - lastActivity > INACTIVITY_MS) {
      get().clearConversation()
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
