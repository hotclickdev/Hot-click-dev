import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import CartModal, { type CarritoRecuperable } from './CartModal'
import type { ReactNode } from 'react'
import type { DestinoAtras } from '@/components/comprador/header/tiposHeader'
import type { Producto } from '@/types/producto'

export type PropsCarritoRecuperable = {
  showCartRecovery: boolean
  recoveryCart: CarritoRecuperable | null
  addItem: (product: Producto, qty?: number) => void
  onCloseCart: () => void
  onDoneCart: () => void
}

/**
 * Marco de "Crear cuenta" (derivado de Figma `28:1143`): misma barra interna y columna blanca de 420 px que
 * ingresar. Conserva el modal de recuperación de carrito.
 */
export default function RegistroMarco({ titulo, atras, children, carrito }: {
  titulo: string
  atras?: DestinoAtras
  children: ReactNode
  carrito: PropsCarritoRecuperable
}) {
  const { t } = useTranslation()
  return (
    <MainLayout variante="interna" titulo={titulo || t('register.title')} atras={atras} encabezadoEscritorio="minimo">
      <div className="mx-auto flex w-full max-w-[420px] flex-col bg-hc-n-0 pb-0 max-lg:min-h-[calc(100dvh-51px)] lg:my-10 lg:rounded-[18px] lg:border lg:border-hc-n-200">
        {children}
      </div>
      <CartModal open={carrito.showCartRecovery} cart={carrito.recoveryCart} addItem={carrito.addItem}
        onClose={carrito.onCloseCart} onDone={carrito.onDoneCart} />
    </MainLayout>
  )
}
