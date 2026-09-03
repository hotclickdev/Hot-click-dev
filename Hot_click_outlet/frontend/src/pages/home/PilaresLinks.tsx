import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PILARES_HOTCLICK, type PilarHotClick, type VariantePilar } from './pilaresHotClick'
import { analytics } from '@/utils/analytics'
import type { CSSProperties } from 'react'

const CLASE_VARIANTE: Record<VariantePilar, string> = {
  primary: 'hc-btn hc-btn-primary',
  ghost: 'hc-btn hc-btn-ghost',
  outline: 'hc-btn hc-btn-outline',
}

/**
 * Tres salidas del producto: Comprar (primario), Vender y Emprender (secundarios).
 */
export default function PilaresLinks({ tono = 'claro' }: { tono?: 'claro' | 'oscuro' }) {
  const { t } = useTranslation()
  const oscuro = tono === 'oscuro'
  const comprar = PILARES_HOTCLICK.find((p) => p.id === 'comprar')
  const secundarios = PILARES_HOTCLICK.filter((p) => p.id !== 'comprar')

  return (
    <div className="flex flex-col gap-2 sm:gap-3 max-w-2xl mx-auto">
      {comprar && (
        <PilarBoton pilar={comprar} oscuro={oscuro} label={t(comprar.labelKey)} hint={t(comprar.hintKey)} />
      )}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {secundarios.map((pilar) => (
          <PilarBoton
            key={pilar.id}
            pilar={pilar}
            oscuro={oscuro}
            label={t(pilar.labelKey)}
            hint={t(pilar.hintKey)}
          />
        ))}
      </div>
    </div>
  )
}

function PilarBoton({
  pilar,
  oscuro,
  label,
  hint,
}: {
  pilar: PilarHotClick
  oscuro: boolean
  label: string
  hint: string
}) {
  const alto = pilar.variant === 'primary' ? 48 : 44
  return (
    <div className="flex flex-col items-center gap-1">
      <Link
        to={pilar.to}
        className={`${CLASE_VARIANTE[pilar.variant]} w-full px-1 sm:px-3`}
        style={{
          minHeight: alto,
          height: alto,
          ...(oscuro && pilar.variant !== 'primary' ? estiloOscuro() : {}),
        }}
        onClick={() => analytics.homePillar(pilar.id)}
      >
        {label}
      </Link>
      <span
        className="hidden sm:block text-[10px] text-center"
        style={{ color: oscuro ? 'var(--hc-blue-200)' : 'var(--hc-muted)' }}
      >
        {hint}
      </span>
    </div>
  )
}

function estiloOscuro(): CSSProperties {
  return { color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.4)' }
}
