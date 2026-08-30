import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'

type UiTheme = string
type UiLanguage = string
type UiFontSize = string
type UiColorFilter = string

type UiState = {
  theme: UiTheme
  language: UiLanguage
  fontSize: UiFontSize
  highContrast: boolean
  reduceMotion: boolean
  colorFilter: UiColorFilter
  setTheme: (theme: UiTheme) => void
  setLanguage: (language: UiLanguage) => void
  setFontSize: (fontSize: UiFontSize) => void
  toggleHighContrast: () => void
  toggleReduceMotion: () => void
  setColorFilter: (colorFilter: UiColorFilter) => void
  cartDrawerOpen: boolean
  searchOpen: boolean
  authPromptOpen: boolean
  setCartDrawerOpen: (v: boolean) => void
  setSearchOpen: (v: boolean) => void
  setAuthPromptOpen: (v: boolean) => void
}

const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // ── Persisted preferences ───────────────────────────────────────────────
      theme: 'light',
      language: 'es',
      fontSize: 'normal',
      highContrast: false,
      reduceMotion: false,
      colorFilter: 'none',

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => { void i18n.changeLanguage(language); set({ language }) },
      setFontSize: (fontSize) => set({ fontSize }),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      toggleReduceMotion: () => set((s) => ({ reduceMotion: !s.reduceMotion })),
      setColorFilter: (colorFilter) => set({ colorFilter }),

      // ── Transient UI state (not persisted) ──────────────────────────────────
      cartDrawerOpen: false,
      searchOpen: false,
      authPromptOpen: false,

      setCartDrawerOpen: (v) => set({ cartDrawerOpen: v }),
      setSearchOpen: (v) => set({ searchOpen: v }),
      setAuthPromptOpen: (v) => set({ authPromptOpen: v }),
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
        colorFilter: s.colorFilter,
      }),
    }
  )
)

export default useUiStore
