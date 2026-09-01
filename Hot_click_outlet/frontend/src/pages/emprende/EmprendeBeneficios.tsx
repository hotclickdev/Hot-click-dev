import { useTranslation } from 'react-i18next'
import {
  IconPerkLogistica,
  IconPerkPagos,
  IconPerkPanel,
  IconPerkSoporte,
} from '@/pages/registro-empresa/registroEmpresaIcons'
import EmprendeSeccion from './EmprendeSeccion'
import type { ComponentType } from 'react'

const BENEFICIOS: { id: string; icon: ComponentType }[] = [
  { id: 'beneficio1', icon: IconPerkPanel },
  { id: 'beneficio2', icon: IconPerkPagos },
  { id: 'beneficio3', icon: IconPerkLogistica },
  { id: 'beneficio4', icon: IconPerkSoporte },
]

/** Beneficios de vender en HotClick. */
export default function EmprendeBeneficios() {
  const { t } = useTranslation()

  return (
    <EmprendeSeccion
      id="beneficios"
      title={t('emprende.beneficiosTitle')}
      subtitle={t('emprende.beneficiosSub')}
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {BENEFICIOS.map(({ id, icon: Icon }) => (
          <li
            key={id}
            className="flex gap-3 rounded-2xl border p-4"
            style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 p-2"
              style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-primary)' }}
            >
              <Icon />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                {t(`emprende.${id}Title`)}
              </span>
              <span className="block text-xs mt-1 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                {t(`emprende.${id}Desc`)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </EmprendeSeccion>
  )
}
