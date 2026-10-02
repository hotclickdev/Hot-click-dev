import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useWishlistStore from '@/store/wishlistStore'
import ProductCard from '@/components/comprador/ProductCard'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { IconoCorazon } from '@/components/comprador/estados/iconosEstado'
import type { Producto } from '@/types/producto'
import { FONDO_BLANCO_VACIO } from './perfil/cuenta/cuentaEstilos'

/** Favoritos: Figma `30:1224` (con productos) y `45:1799` (vacío). Usa la `ProductCard` compartida. */
export default function WishlistPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const items = useWishlistStore((s) => s.items)
  const cantidad = t('favoritos.guardados', { count: items.length })

  if (items.length === 0) {
    return (
      <MainLayout variante="interna" titulo={t('favoritos.titulo')} atras="/perfil" barraInferior>
        <div className={FONDO_BLANCO_VACIO}>
          <EstadoVacio
            nivel="h1"
            tono="rojo"
            espaciado="cuenta"
            icono={<IconoCorazon />}
            titulo={t('favoritos.vacioTitulo')}
            texto={t('favoritos.vacioTexto')}
            accion={{ texto: t('favoritos.explorar'), onClick: () => navigate('/productos') }}
          >
            <p className="flex items-center gap-[10px] rounded-[12px] bg-hc-blue-50 px-[14px] py-3 text-left text-[13px] leading-[18px] text-hc-blue-600">
              <IconoFigma src={ICONOS_COMPRADOR.consultaDestello} size={18} className="shrink-0" />
              <span className="min-w-0 flex-1">{t('favoritos.consejo')}</span>
            </p>
          </EstadoVacio>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout
      variante="interna"
      titulo={t('favoritos.titulo')}
      esTituloPrincipal
      atras="/perfil"
      barraInferior
      acciones={<span className="shrink-0 text-[13px] leading-[normal] text-hc-n-500">{cantidad}</span>}
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-5 pt-[14px] lg:px-8 lg:pb-10 lg:pt-8">
        <div className="mb-6 hidden items-baseline justify-between lg:flex">
          <h1 className="font-display text-[28px] font-bold leading-[normal] text-hc-n-900">{t('favoritos.titulo')}</h1>
          <p className="text-[13px] text-hc-n-500">{cantidad}</p>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,167px)] justify-between gap-y-4 lg:justify-start lg:gap-x-4">
          {items.map((item) => (
            <li key={item.id}>
              <ProductCard product={item as unknown as Producto} className="w-[167px]" />
            </li>
          ))}
        </ul>
      </div>
    </MainLayout>
  )
}
