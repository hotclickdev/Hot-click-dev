import { Boton, IconoEstado } from './ui'
import { useSellerRuta } from './SellerPlanContext'

/**
 * Compra confirmada (Figma 61:585).
 */
export default function CompraOkPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-32 text-center">
      <IconoEstado variante="ok" />
      <h1 className="font-display text-xl font-bold">Compra realizada</h1>
      <p className="mt-2 text-sm text-hc-muted">
        Tu pedido de Auriculares Bluetooth X200 fue confirmado. Te avisaremos cuando el vendedor lo despache.
      </p>
      <div className="mt-8">
        <Boton to={ruta('tienda')}>Volver a la tienda</Boton>
      </div>
    </main>
  )
}
