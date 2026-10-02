import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'
import SelfCheckoutProductCard from './SelfCheckoutProductCard'
import { categoriasDelMenu, filtrarMenu } from './selfCheckoutFormat'
import type { CarritoSelfCheckout, ProductoSelfCheckout } from './selfCheckoutTypes'

type Props = Readonly<{
  productos: ProductoSelfCheckout[]
  carrito: CarritoSelfCheckout
  onCambiar: (producto: ProductoSelfCheckout, cantidad: number) => void
}>

/** Menú del negocio (Figma `29:1661` y `29:1688`): buscador, categorías y filas de producto. */
export default function SelfCheckoutCatalogo({ productos, carrito, onCambiar }: Props) {
  const { t } = useTranslation()
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)

  const categorias = useMemo(() => categoriasDelMenu(productos), [productos])
  const visibles = useMemo(() => filtrarMenu(productos, categoria, texto), [productos, categoria, texto])

  return (
    <>
      <div className="flex flex-col gap-[10px] bg-hc-n-0 px-4 pb-3">
        <label className="flex items-center gap-2 rounded-[12px] bg-hc-n-100 px-3 py-[10px]">
          <img src={ICONOS_QR.buscar} alt="" className="size-[18px] shrink-0" />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={t('pos.mesa.buscar')}
            aria-label={t('pos.mesa.buscar')}
            className="hc-input-libre h-[18px] min-w-0 flex-1 bg-transparent p-0 text-[14px] leading-[18px] text-hc-n-900 outline-none placeholder:text-hc-n-500"
          />
        </label>
        {categorias.length > 0 ? (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
            <Chip activo={categoria === null} onClick={() => setCategoria(null)}>
              {t('pos.mesa.todo')}
            </Chip>
            {categorias.map((c) => (
              <Chip key={c} activo={categoria === c} onClick={() => setCategoria(c)}>
                {c}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      {visibles.length === 0 ? (
        <p className="px-4 py-16 text-center text-[14px] text-hc-n-500">
          {productos.length === 0 ? t('pos.mesa.sinProductos') : t('pos.mesa.sinResultados')}
        </p>
      ) : (
        <ul className="flex flex-col gap-[10px] px-4 pb-[110px] pt-3">
          {visibles.map((p) => (
            <SelfCheckoutProductCard
              key={String(p.id)}
              producto={p}
              cantidad={carrito[String(p.id)]?.cantidad ?? 0}
              onCambiar={onCambiar}
            />
          ))}
        </ul>
      )}
    </>
  )
}

function Chip({ activo, onClick, children }: Readonly<{ activo: boolean; onClick: () => void; children: string }>) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-[14px] py-2 text-[13px] font-medium leading-[15px] ${
        activo
          ? 'border-hc-blue-600 bg-hc-blue-600 text-white'
          : 'border-hc-n-200 bg-hc-n-0 text-hc-n-900'
      }`}
    >
      {children}
    </button>
  )
}
