import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PILARES_HOTCLICK } from './pilaresHotClick'

const CLASE_VARIANTE = {
  primary: 'hc-btn hc-btn-primary',
  ghost: 'hc-btn hc-btn-ghost',
  outline: 'hc-btn hc-btn-outline',
}

/**
 * Tres salidas del producto: Comprar, Vender, Emprender.
 * @param {{ tono?: 'claro' | 'oscuro' }} props
 */
export default function PilaresLinks({ tono = 'claro' }) {
  const { t } = useTranslation()
  const oscuro = tono === 'oscuro'
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-2xl mx-auto">
      {PILARES_HOTCLICK.map((pilar) => (
        <div key={pilar.id} className="flex flex-col items-center gap-1">
          <Link
            to={pilar.to}
            className={`${CLASE_VARIANTE[pilar.variant]} w-full px-1 sm:px-3`}
            style={{
              minHeight: 44,
              height: 44,
              ...(oscuro && pilar.variant !== 'primary' ? estiloOscuro() : {}),
            }}
          >
            {t(pilar.labelKey)}
          </Link>
          <span className="hidden sm:block text-[10px] text-center" style={{ color: oscuro ? 'var(--hc-blue-200)' : 'var(--hc-muted)' }}>
            {t(pilar.hintKey)}
          </span>
        </div>
      ))}
    </div>
  )
}

function estiloOscuro() {
  return { color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.4)' }
}
