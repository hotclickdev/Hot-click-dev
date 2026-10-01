import { useTranslation } from 'react-i18next'
import HojaInferior from '@/components/comprador/HojaInferior'
import { ICONOS_ESTADOS } from '@/components/comprador/estados/iconosEstados'
import useUiStore from '@/store/uiStore'
import Interruptor from '@/components/ui/sistema/Interruptor'
import OpcionChip from '@/components/ui/sistema/OpcionChip'
import { BOTON_HOJA_PRIMARIO, TITULO_HOJA } from '@/components/ui/sistema/estilosHoja'
import { LANGUAGES } from './a11yConstants'

type HojaIdiomaAccesibilidadProps = {
  abierta: boolean
  onCerrar: () => void
}

/** Valores de `fontSize` del store: A− = normal, A = lg, A+ = xl (la etiqueta "A" es la letra mediana). */
const TAMANOS_FUENTE = [
  { valor: 'normal', clave: 'a11y.small' },
  { valor: 'lg', clave: 'a11y.normal' },
  { valor: 'xl', clave: 'a11y.large' },
] as const

const ETIQUETA_GRUPO = 'font-sans text-[14px] font-medium leading-[normal] tracking-normal text-hc-n-900'

/**
 * Idioma y accesibilidad (Figma `51:2234`): idioma, tamaño de fuente, alto contraste y reducir
 * movimiento. Sin tema ni filtro de color: Figma no los dibuja.
 */
export default function HojaIdiomaAccesibilidad({ abierta, onCerrar }: HojaIdiomaAccesibilidadProps) {
  const { t } = useTranslation()
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)
  const fontSize = useUiStore((s) => s.fontSize)
  const setFontSize = useUiStore((s) => s.setFontSize)
  const highContrast = useUiStore((s) => s.highContrast)
  const toggleHighContrast = useUiStore((s) => s.toggleHighContrast)
  const reduceMotion = useUiStore((s) => s.reduceMotion)
  const toggleReduceMotion = useUiStore((s) => s.toggleReduceMotion)

  return (
    <HojaInferior
      abierta={abierta}
      onCerrar={onCerrar}
      titulo={(
        <div className="flex items-center gap-2">
          <img src={ICONOS_ESTADOS.accesibilidad} alt="" width={24} height={24} className="block size-6 shrink-0" />
          <h2 className={TITULO_HOJA}>{t('a11y.hojaTitulo')}</h2>
        </div>
      )}
    >
      <div role="group" aria-labelledby="a11y-idioma" className="flex flex-col gap-2">
        <p id="a11y-idioma" className={ETIQUETA_GRUPO}>{t('lang.select')}</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(({ code, label }) => (
            <OpcionChip key={code} activa={language === code} onClick={() => setLanguage(code)}>{label}</OpcionChip>
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="a11y-fuente" className="flex flex-col gap-2">
        <p id="a11y-fuente" className={ETIQUETA_GRUPO}>{t('a11y.tamanoFuente')}</p>
        <div className="flex flex-wrap gap-2">
          {TAMANOS_FUENTE.map(({ valor, clave }) => (
            <OpcionChip key={valor} activa={fontSize === valor} onClick={() => setFontSize(valor)}>{t(clave)}</OpcionChip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className={ETIQUETA_GRUPO}>{t('a11y.altoContraste')}</p>
        <Interruptor activo={highContrast} onCambio={toggleHighContrast} etiqueta={t('a11y.altoContraste')} />
      </div>
      <div className="flex items-center justify-between">
        <p className={ETIQUETA_GRUPO}>{t('a11y.reducirMovimiento')}</p>
        <Interruptor activo={reduceMotion} onCambio={toggleReduceMotion} etiqueta={t('a11y.reducirMovimiento')} />
      </div>

      <div className="flex">
        <button type="button" onClick={onCerrar} className={BOTON_HOJA_PRIMARIO}>{t('a11y.listo')}</button>
      </div>
    </HojaInferior>
  )
}
