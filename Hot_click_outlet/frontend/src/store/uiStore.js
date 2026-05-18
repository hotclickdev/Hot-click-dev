import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'

const useUiStore = create(
  persist(
    (set) => ({
      // ── Persisted preferences ───────────────────────────────────────────────
      theme: 'light',
      language: 'es',
      fontSize: 'normal',
      highContrast: false,
      reduceMotion: false,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => { i18n.changeLanguage(language); set({ language }) },
      setFontSize: (fontSize) => set({ fontSize }),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      toggleReduceMotion: () => set((s) => ({ reduceMotion: !s.reduceMotion })),

      // ── Transient UI state (not persisted) ──────────────────────────────────
      cartDrawerOpen: false,
      searchOpen: false,

      setCartDrawerOpen: (v) => set({ cartDrawerOpen: v }),
      setSearchOpen: (v) => set({ searchOpen: v }),
    }),
    {
      name: 'hotclick-ui',
      // Only persist preferences, not transient UI state
      partialize: (s) => ({
        theme: s.theme,
        language: s.language,
        fontSize: s.fontSize,
        highContrast: s.highContrast,
        reduceMotion: s.reduceMotion,
      }),
    }
  )
)

export default useUiStore
