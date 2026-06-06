import { create } from 'zustand'

const useChatStore = create((set) => ({
  isOpen: false,
  pendingMessage: null,
  open: (message = null) => set({ isOpen: true, pendingMessage: message }),
  close: () => set({ isOpen: false }),
  clearPending: () => set({ pendingMessage: null }),
}))

export default useChatStore
