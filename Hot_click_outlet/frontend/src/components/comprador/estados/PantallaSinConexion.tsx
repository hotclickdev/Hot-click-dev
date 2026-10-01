import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useRecentlyViewedStore from '@/store/recentlyViewedStore'
import useWishlistStore from '@/store/wishlistStore'
import { ICONOS_ESTADOS } from './iconosEstados'

const MAX_VISTOS = 4
const MAX_FAVORITOS = 4

type Guardado = { id: number | string; nombre: string; imagenUrl?: string | null }

type PantallaSinConexionProps = {
  onReintentar?: () => void
}

function Miniatura({ item, className }: { item: Guardado; className: string }) {
  return (
    <li className={className}>
      <Link to={`/productos/${item.id}`} aria-label={item.nombre} className="block size-full overflow-hidden rounded-[12px] bg-hc-n-100">
        {item.imagenUrl && <img src={item.imagenUrl} alt="" className="size-full object-cover" />}
      </Link>
    </li>
  )
}

/**
 * Sin conexión (Figma `45:2264`): mensaje, lo que el comprador ya vio y sus favoritos (guardados en el
 * dispositivo) y Reintentar. La franja superior es global (`AvisoSinConexion`).
 */
export default function PantallaSinConexion({ onReintentar = () => globalThis.location.reload() }: PantallaSinConexionProps) {
  const { t } = useTranslation()
  const vistos = useRecentlyViewedStore((s) => s.items).slice(0, MAX_VISTOS)
  const favoritos = useWishlistStore((s) => s.items).slice(0, MAX_FAVORITOS)

  return (
    <MainLayout variante="propia" pie={false}>
      <div className="min-h-[calc(100dvh-72px)] bg-hc-n-50 lg:min-h-0">
        <div className="mx-auto w-full max-w-[430px]">
          <section className="flex flex-col items-center gap-3 px-5 pb-2 pt-10 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-hc-n-100">
              <img src={ICONOS_ESTADOS.offlineGrande} alt="" width={28.16} height={28.16} />
            </span>
            <h1 className="font-display text-[20px] font-bold leading-[normal] tracking-normal text-hc-n-900">{t('estadosComprador.sinConexionTitulo')}</h1>
            <p className="text-[14px] leading-5 text-hc-n-600">{t('estadosComprador.sinConexionTexto')}</p>
          </section>

          {(vistos.length > 0 || favoritos.length > 0) && (
            <section className="flex flex-col gap-[10px] px-5 pb-2 pt-4">
              {vistos.length > 0 && (
                <>
                  <h2 className="font-sans text-[14px] font-semibold leading-[normal] tracking-normal text-hc-n-900">{t('estadosComprador.vistosRecientes')}</h2>
                  <ul className="flex gap-[10px]">
                    {vistos.map((v) => <Miniatura key={v.id} item={v} className="h-[76px] min-w-0 flex-1" />)}
                  </ul>
                </>
              )}
              {favoritos.length > 0 && (
                <>
                  <h2 className="font-sans text-[14px] font-semibold leading-[normal] tracking-normal text-hc-n-900">{t('estadosComprador.favoritos')}</h2>
                  <ul className="flex gap-[10px]">
                    {favoritos.map((f) => <Miniatura key={f.id} item={f} className="size-[76px] shrink-0" />)}
                  </ul>
                </>
              )}
            </section>
          )}

          <div className="flex flex-col gap-[10px] px-5 pb-2 pt-[14px]">
            <button
              type="button"
              onClick={onReintentar}
              className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 py-[14px] text-[15px] font-semibold leading-[normal] text-hc-n-900"
            >
              <img src={ICONOS_ESTADOS.offlineReintentar} alt="" width={18} height={18} />
              {t('estadosComprador.reintentar')}
            </button>
            <p className="text-center text-[12px] leading-4 text-hc-n-500">{t('estadosComprador.sinConexionNota')}</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
