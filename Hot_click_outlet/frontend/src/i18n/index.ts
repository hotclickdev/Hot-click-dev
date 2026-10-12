import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es.json'
import en from './locales/en.json'
import pt from './locales/pt.json'
import { variablesTiemposEnvio } from '@/config/tiemposEnvio'

type UiPersistido = { state?: { language?: string } }

let savedUi: UiPersistido
try {
  savedUi = JSON.parse(localStorage.getItem('hotclick-ui') || '{}') as UiPersistido
} catch {
  savedUi = {}
}
export const IDIOMAS_SOPORTADOS = ['es', 'en', 'pt'] as const
const guardado = savedUi?.state?.language
// Un idioma guardado que no soportamos (o vacío) arranca en español, nunca en otro idioma.
const initialLang = guardado && (IDIOMAS_SOPORTADOS as readonly string[]).includes(guardado) ? guardado : 'es'

void i18n
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en }, pt: { translation: pt } },
    lng: initialLang,
    supportedLngs: [...IDIOMAS_SOPORTADOS],
    // Clave que falte en en/pt → español (nunca portugués ni la clave cruda).
    fallbackLng: 'es',
    // D13: los tiempos de envío salen de `config/tiemposEnvio.ts` (una sola fuente).
    interpolation: { escapeValue: false, defaultVariables: variablesTiemposEnvio() },
  })

export default i18n
