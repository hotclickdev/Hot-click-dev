import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es.json'
import en from './locales/en.json'
import pt from './locales/pt.json'
import { variablesTiemposEnvio } from '@/config/tiemposEnvio'

type UiPersistido = { state?: { language?: string } }

let savedUi: UiPersistido = {}
try {
  savedUi = JSON.parse(localStorage.getItem('hotclick-ui') || '{}') as UiPersistido
} catch {
  savedUi = {}
}
const initialLang = savedUi?.state?.language || 'es'

void i18n
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en }, pt: { translation: pt } },
    lng: initialLang,
    fallbackLng: 'es',
    // D13: los tiempos de envío salen de `config/tiemposEnvio.ts` (una sola fuente).
    interpolation: { escapeValue: false, defaultVariables: variablesTiemposEnvio() },
  })

export default i18n
