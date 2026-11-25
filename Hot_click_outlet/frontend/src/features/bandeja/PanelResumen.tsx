import { useTranslation } from 'react-i18next'
import type { EstadoResumen } from './bandejaTypes'

type Props = Readonly<{
  estado: EstadoResumen
  onGenerar: () => void
  /** Copia la sugerencia a la caja de respuesta; la persona la edita y la envía ella. */
  onUsar: (texto: string) => void
}>

const BOTON = 'min-h-11 rounded-[10px] border border-hc-border bg-hc-surface px-4 text-sm font-bold text-hc-text transition-colors hover:border-hc-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hc-blue-600)]'

/** Panel "Resumen" de la conversación (AG-17): resumen corto con IA y respuesta sugerida editable. No envía nada. */
export default function PanelResumen({ estado, onGenerar, onUsar }: Props) {
  const { t } = useTranslation()
  const cargando = estado.tipo === 'cargando'
  const listo = estado.tipo === 'listo'
  return (
    <section aria-label={t('bandeja.resumenTitulo')} className="border-b border-hc-border bg-hc-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold text-hc-text">{t('bandeja.resumenTitulo')}</h3>
        <button type="button" className={BOTON} onClick={onGenerar} disabled={cargando}>
          {cargando ? t('bandeja.resumenGenerando') : t('bandeja.resumenGenerar')}
        </button>
      </div>
      {listo && (
        <div className="mt-3 space-y-3">
          <p className="whitespace-pre-wrap break-words text-sm text-hc-text">{estado.resumen}</p>
          {estado.sugerencia && (
            <div className="rounded-[10px] bg-[var(--hc-blue-50)] p-3">
              <p className="text-xs font-bold text-[var(--hc-blue-600)]">{t('bandeja.resumenSugerencia')}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-hc-text">{estado.sugerencia}</p>
              <button type="button" className={`${BOTON} mt-2`} onClick={() => onUsar(estado.sugerencia)}>
                {t('bandeja.resumenUsar')}
              </button>
            </div>
          )}
          <p className="text-xs text-hc-muted">{t('bandeja.resumenAviso')}</p>
        </div>
      )}
      {(estado.tipo === 'noDisponible' || estado.tipo === 'error') && (
        <p role="alert" className="mt-3 text-sm text-[var(--hc-danger)]">
          {estado.tipo === 'error' ? estado.mensaje : t('bandeja.resumenNoDisponible')}
        </p>
      )}
    </section>
  )
}
