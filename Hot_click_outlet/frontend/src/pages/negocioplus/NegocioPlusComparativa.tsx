import { useTranslation } from 'react-i18next'
import EmprendeSeccion from '../emprende/EmprendeSeccion'

type Fila = { labelKey: string; pyme: string; plus: string }

const FILAS: Fila[] = [
  { labelKey: 'comparativaSucursales', pyme: 'comparativaSucursalesPyme', plus: 'comparativaSucursalesPlus' },
  { labelKey: 'comparativaUsuarios', pyme: 'comparativaUsuariosPyme', plus: 'comparativaUsuariosPlus' },
  { labelKey: 'comparativaCrm', pyme: 'comparativaCrmPyme', plus: 'comparativaCrmPlus' },
  { labelKey: 'comparativaIa', pyme: 'comparativaIaPyme', plus: 'comparativaIaPlus' },
]

/** Tabla comparativa Negocio Plus vs. PYME. */
export default function NegocioPlusComparativa() {
  const { t } = useTranslation()

  return (
    <EmprendeSeccion title={t('negocioPlus.comparativaTitle')}>
      <div className="rounded-lg border overflow-hidden max-w-2xl" style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}>
        <div className="flex items-center px-6 py-4">
          <div className="flex-1" />
          <p className="w-[110px] sm:w-40 text-center text-[13px] font-semibold" style={{ color: 'var(--hc-text)' }}>
            {t('negocioPlus.comparativaColPyme')}
          </p>
          <p className="w-[110px] sm:w-40 text-center text-[13px] font-semibold" style={{ color: 'var(--hc-text)' }}>
            {t('negocioPlus.comparativaColPlus')}
          </p>
        </div>
        {FILAS.map((fila) => (
          <div
            key={fila.labelKey}
            className="flex items-center px-6 py-4 border-t"
            style={{ borderColor: 'var(--hc-border)' }}
          >
            <p className="flex-1 text-sm" style={{ color: 'rgba(20,23,28,0.8)' }}>{t(`negocioPlus.${fila.labelKey}`)}</p>
            <p
              className="w-[110px] sm:w-40 text-center text-[13px]"
              style={{ color: 'rgba(20,23,28,0.75)', fontFamily: 'var(--hc-font-mono)' }}
            >
              {t(`negocioPlus.${fila.pyme}`)}
            </p>
            <p
              className="w-[110px] sm:w-40 mx-auto text-center text-[13px] font-semibold px-2.5 py-1 rounded-md"
              style={{ color: 'var(--hc-blue-600)', backgroundColor: '#eff4fe', fontFamily: 'var(--hc-font-mono)' }}
            >
              {t(`negocioPlus.${fila.plus}`)}
            </p>
          </div>
        ))}
      </div>
    </EmprendeSeccion>
  )
}
