import { useTranslation } from 'react-i18next'
import EmprendeFoto from './EmprendeFoto'
import EmprendeSeccion from './EmprendeSeccion'
import { FOTOS_EMPRENDE } from './emprendeImagenes'

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
      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <ol className="flex flex-col gap-3">
          {PASOS_FORM.map((key, indice) => (
            <PasoFormulario key={key} indice={indice} titleKey={key} />
          ))}
        </ol>
        <EmprendeFoto
          src={FOTOS_EMPRENDE.mercado.local}
          fallback={FOTOS_EMPRENDE.mercado.fallback}
          alt={t(FOTOS_EMPRENDE.mercado.altKey)}
          className="w-full h-48 sm:h-full min-h-[180px] object-cover rounded-2xl"
        />
      </div>
      <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        {t('emprende.formNota')}
      </p>
    </EmprendeSeccion>
  )
}

function PasoFormulario({ indice, titleKey }: { indice: number; titleKey: typeof PASOS_FORM[number] }) {
  const { t } = useTranslation()
  return (
    <li
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
          {t(`emprende.${titleKey}Title`)}
        </span>
        <span className="block text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          {t(`emprende.${titleKey}Desc`)}
        </span>
      </span>
    </li>
  )
}
