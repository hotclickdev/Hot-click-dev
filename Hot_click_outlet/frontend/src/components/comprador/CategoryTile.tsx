import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

type CategoryTileProps = {
  nombre: string
  cantidad: number
  fotoUrl?: string | null
  to: string
  className?: string
}

/** Categoría con foto representativa y cantidad real de productos (Figma `5:39`). */
export default function CategoryTile({ nombre, cantidad, fotoUrl, to, className = '' }: CategoryTileProps) {
  const { t } = useTranslation()
  return (
    <Link to={to} className={`flex flex-col items-start gap-2 ${className}`}>
      <span className="block h-[112px] w-full overflow-hidden rounded-[14px] bg-hc-n-100">
        {fotoUrl && <img src={fotoUrl} alt="" className="size-full object-cover" loading="lazy" decoding="async" />}
      </span>
      <span className="flex flex-col items-start">
        <span className="font-display text-[14px] font-semibold leading-[normal] text-hc-n-900">{nombre}</span>
        <span className="text-[12px] leading-[normal] text-hc-n-600">{t('comprador.categoria.productos', { count: cantidad })}</span>
      </span>
    </Link>
  )
}
