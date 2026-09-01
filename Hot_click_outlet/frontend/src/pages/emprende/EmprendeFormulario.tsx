import { useTranslation } from 'react-i18next'
import EmprendeSeccion from './EmprendeSeccion'

const PASOS_FORM = ['formStep1', 'formStep2', 'formStep3'] as const

/** Qué pide el formulario de alta en /registro-empresa. */
export default function EmprendeFormulario() {
  const { t } = useTranslation()

  return (
    <EmprendeSeccion
      id="formulario"
      title={t('emprende.formTitle')}
      subtitle={t('emprende.formSub')}
    >
      <ol className="flex flex-col gap-3">
        {PASOS_FORM.map((key, indice) => (
          <li
            key={key}
            className="flex items-start gap-3 rounded-2xl border px-4 py-4"
            style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
            >
              {indice + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                {t(`emprende.${key}Title`)}
              </span>
              <span className="block text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                {t(`emprende.${key}Desc`)}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        {t('emprende.formNota')}
      </p>
    </EmprendeSeccion>
  )
}
