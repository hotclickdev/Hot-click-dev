import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'

const useUiStore = create(
  persist(
    (set) => ({
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
    }),
    { name: 'hotclick-ui' }
  )
)

export default useUiStore
