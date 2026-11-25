import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ConfiguracionTab from './ConfiguracionTab'
import ConocimientoTab from './ConocimientoTab'
import CanalesTab from './CanalesTab'
import EquipoPinTab from './EquipoPinTab'
import SimuladorTab from './SimuladorTab'
import LeadsTab from './LeadsTab'
import CampanasTab from './CampanasTab'
import MetricasTab from './MetricasTab'
import UsoMes from './UsoMes'
import { indiceSiguiente, PESTANAS, type Pestana } from './botHelpers'

const PANELES: Record<Pestana, () => React.JSX.Element> = {
  config: ConfiguracionTab,
  conocimiento: ConocimientoTab,
  canales: CanalesTab,
  equipo: EquipoPinTab,
  simulador: SimuladorTab,
  leads: LeadsTab,
  metricas: MetricasTab,
  campanas: CampanasTab,
}

/** Panel del bot de ventas (AG-19, AG-20, AG-22, AG-27, AG-36): configuración, conocimiento, canales, equipo, simulador, leads y campañas. */
export default function BotPage({
  inicial,
  pestanas = PESTANAS,
}: Readonly<{ inicial?: Pestana; pestanas?: readonly Pestana[] }>) {
  const { t } = useTranslation()
  const [activa, setActiva] = useState<Pestana>(inicial ?? pestanas[0] ?? 'config')
  const botones = useRef<Array<HTMLButtonElement | null>>([])
  const Panel = PANELES[activa]

  const alTeclear = (e: React.KeyboardEvent, i: number) => {
    const n = indiceSiguiente(i, e.key, pestanas.length)
    if (n == null) return
    e.preventDefault()
    setActiva(pestanas[n])
    botones.current[n]?.focus()
  }

  return (
    <main className="p-4 sm:p-6" data-mm="bot-ventas">
      <h1 className="font-display text-2xl font-bold text-hc-text">{t('bot.titulo')}</h1>
      <p className="mt-1 text-sm text-hc-muted">{t('bot.subtitulo')}</p>
      <div className="mt-4 max-w-xl"><UsoMes /></div>
      <div role="tablist" aria-label={t('bot.pestanasAria')} className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {pestanas.map((p, i) => (
          <button
            key={p} type="button" role="tab" id={`bot-tab-${p}`} aria-selected={activa === p}
            aria-controls={`bot-panel-${p}`} tabIndex={activa === p ? 0 : -1}
            ref={(el) => { botones.current[i] = el }}
            onClick={() => setActiva(p)} onKeyDown={(e) => alTeclear(e, i)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold transition-colors ${activa === p ? 'bg-hc-primary text-white' : 'border border-hc-border bg-hc-surface text-hc-text'}`}
          >
            {t(`bot.pestanas.${p}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`bot-panel-${activa}`} aria-labelledby={`bot-tab-${activa}`} className="mt-4">
        <Panel />
      </div>
    </main>
  )
}
