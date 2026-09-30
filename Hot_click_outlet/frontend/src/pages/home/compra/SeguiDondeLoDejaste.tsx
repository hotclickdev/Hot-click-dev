import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useRecentlyViewedStore from '@/store/recentlyViewedStore'
import { formatPrice } from '@/utils/format'
import EncabezadoSeccion from './EncabezadoSeccion'
import { MAX_VISTOS } from '../homeCompraHelpers'

/** Vistos recientemente (Figma `7:170`): solo existe si hay historial. */
export default function SeguiDondeLoDejaste() {
  const { t } = useTranslation()
  const vistos = useRecentlyViewedStore((s) => s.items).slice(0, MAX_VISTOS)
  if (vistos.length === 0) return null

  return (
    <section aria-labelledby="home-seguir" className="flex flex-col gap-3 px-4 pb-[6px] pt-[22px] lg:gap-4 lg:px-8 lg:pb-2 lg:pt-11 xl:px-[120px]">
      <EncabezadoSeccion id="home-seguir" titulo={t('home.compra.seguirTitulo')} nota={t('home.compra.seguirNota')} />
      <ul className="grid grid-cols-4 gap-[10px] lg:gap-4">
        {vistos.map((item) => (
          <li key={item.id}>
            <Link
              to={`/productos/${item.id}`}
              aria-label={t('home.viewProductAria', { name: item.nombre, price: formatPrice(item.precio) })}
              className="flex flex-col gap-[6px] lg:flex-row lg:items-center lg:gap-3 lg:rounded-[14px] lg:border lg:border-hc-n-200 lg:bg-hc-n-0 lg:py-2 lg:pl-2 lg:pr-4"
            >
              <span className="block h-20 w-full overflow-hidden rounded-[12px] bg-hc-n-100 lg:size-16 lg:shrink-0 lg:rounded-[10px]">
                {item.imagenUrl && <img src={item.imagenUrl} alt="" className="size-full object-cover" loading="lazy" decoding="async" />}
              </span>
              <span className="flex min-w-0 flex-col gap-[2px]">
                <span className="hidden truncate text-[13px] font-medium text-hc-n-900 lg:block">{item.nombre}</span>
                <span className="font-display text-[13px] font-semibold text-hc-n-900 lg:text-[14px] lg:font-bold">{formatPrice(item.precio)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
