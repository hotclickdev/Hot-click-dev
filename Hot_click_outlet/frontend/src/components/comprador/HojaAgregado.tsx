import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import useCartStore from '@/store/cartStore'
import useHojaAgregadoStore from '@/store/hojaAgregadoStore'
import type { ProductoAgregado } from '@/store/hojaAgregadoStore'
import { formatPrice } from '@/utils/format'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'

/** Hoja «Agregado a tu pedido» (Figma `45:1607`), montada una vez para todo el sitio. */
export default function HojaAgregado() {
  const agregado = useHojaAgregadoStore((s) => s.agregado)
  const cerrar = useHojaAgregadoStore((s) => s.cerrar)
  if (!agregado) return null
  return <Hoja agregado={agregado} onCerrar={cerrar} />
}

function Hoja({ agregado, onCerrar }: { agregado: ProductoAgregado; onCerrar: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const seguirRef = useRef<HTMLButtonElement>(null)
  const { producto, cantidad, mismoPaquete } = agregado
  const tienda = producto.empresaNombre?.trim() || 'HotClick'
  const cantidadPedido = items.reduce((suma, i) => suma + (i.cantidad ?? 0), 0)
  const totalPedido = items.reduce((suma, i) => suma + (i.precio ?? 0) * (i.cantidad ?? 0), 0)

  useEffect(() => {
    seguirRef.current?.focus()
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  function verPedido() {
    onCerrar()
    navigate('/carrito')
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button type="button" aria-label={t('compra.agregado.cerrar')} onClick={onCerrar} className="absolute inset-0 bg-hc-n-900" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hoja-agregado-titulo"
        className="relative flex w-full max-w-[480px] flex-col gap-[14px] rounded-t-[22px] bg-hc-n-0 px-[16px] pb-[28px] pt-[10px]"
      >
        <span className="mx-auto h-[4px] w-[40px] rounded-[2px] bg-hc-n-200" />
        <h2 id="hoja-agregado-titulo" className="flex items-center gap-[8px] font-display text-[17px] font-bold text-hc-n-900">
          <span className="flex size-[26px] items-center justify-center rounded-full bg-hc-green-600 text-hc-n-0">
            <IconoFigma src={ICONOS_COMPRA.checkAgregado} size={16} />
          </span>
          {t('compra.agregado.titulo')}
        </h2>
        <div className="flex items-center gap-[12px] rounded-[14px] bg-hc-n-50 p-[10px]">
          {producto.imagenUrl
            ? <img src={producto.imagenUrl} alt="" width={56} height={56} className="size-[56px] shrink-0 rounded-[10px] object-cover" />
            : <span className="size-[56px] shrink-0 rounded-[10px] bg-hc-n-100" />}
          <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="truncate text-[14px] font-medium text-hc-n-900">{producto.nombre}</span>
            <span className="truncate text-[12px] text-hc-n-500">{tienda} · {t('compra.unidades', { count: cantidad })}</span>
          </span>
          <span className="shrink-0 font-display text-[15px] font-bold text-hc-n-900">{formatPrice(producto.precio * cantidad)}</span>
        </div>
        {mismoPaquete ? (
          <p className="flex items-start gap-[8px] rounded-[10px] bg-hc-green-50 px-[12px] py-[10px] text-[12px] leading-[16px] text-hc-green-600">
            <IconoFigma src={ICONOS_COMPRA.envio} size={16} />
            <span className="flex-1">{t('compra.agregado.mismoPaquete', { tienda })}</span>
          </p>
        ) : null}
        <p className="flex items-start justify-between">
          <span className="text-[13px] text-hc-n-600">{t('compra.agregado.tuPedido', { productos: t('compra.resumen.cantidad', { count: cantidadPedido }) })}</span>
          <span className="font-display text-[14px] font-semibold text-hc-n-900">{formatPrice(totalPedido)}</span>
        </p>
        <div className="flex gap-[10px]">
          <button ref={seguirRef} type="button" onClick={onCerrar} className="flex-1 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[16px] py-[13px] text-[14px] font-semibold text-hc-n-900">
            {t('compra.agregado.seguir')}
          </button>
          <button type="button" onClick={verPedido} className="flex-1 rounded-[12px] bg-hc-red-500 px-[16px] py-[13px] text-[14px] font-semibold text-hc-n-0">
            {t('compra.agregado.verPedido')}
          </button>
        </div>
      </section>
    </div>
  )
}
