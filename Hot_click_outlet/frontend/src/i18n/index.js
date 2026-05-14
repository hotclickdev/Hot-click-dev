import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es.json'
import en from './locales/en.json'
import pt from './locales/pt.json'

const savedUi = JSON.parse(localStorage.getItem('hotclick-ui') || '{}')
const initialLang = savedUi?.state?.language || 'es'

i18n
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en }, pt: { translation: pt } },
    lng: initialLang,
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  })

export default i18n
