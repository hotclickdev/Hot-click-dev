import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * Estado del panel de vendedor cuando la cuenta no tiene un negocio asociado (registro incompleto).
 * Nunca se muestra un catálogo general: solo el paso para terminar el alta en /registrar-negocio.
 * Marca: título Sora, texto Public Sans, un único CTA rojo.
 */
export default function CompletaTuNegocio() {
  const { t } = useTranslation()
  return (
    <main className="flex min-h-dvh items-center justify-center bg-hc-n-0 px-5">
      <section
        aria-labelledby="completa-negocio-titulo"
        className="mx-auto flex w-full max-w-[430px] flex-col items-center gap-[10px] text-center"
      >
        <h1
          id="completa-negocio-titulo"
          className="font-display text-[22px] font-bold leading-[28px] text-hc-n-900 [text-wrap:balance]"
        >
          {t('completaNegocio.titulo')}
        </h1>
        <p className="text-[14px] leading-5 text-hc-n-600">{t('completaNegocio.texto')}</p>
        <Link
          to="/registrar-negocio"
          className="mt-4 w-full rounded-[12px] bg-hc-red-500 px-3 py-[12px] text-[14px] font-semibold text-hc-n-0"
        >
          {t('completaNegocio.cta')}
        </Link>
        <Link to="/" className="py-2 text-[14px] font-medium text-hc-n-600 underline underline-offset-2">
          {t('completaNegocio.volver')}
        </Link>
      </section>
    </main>
  )
}
