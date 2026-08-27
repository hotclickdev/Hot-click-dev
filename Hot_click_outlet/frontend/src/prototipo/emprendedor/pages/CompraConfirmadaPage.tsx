import EnlacePrimario from '../ui/EnlacePrimario'
import IconoExito from '../ui/IconoExito'

/**
 * Paso 12 Compra confirmada (Figma 37:151).
 */
export default function CompraConfirmadaPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 px-5 pb-16 pt-36 text-center">
      <IconoExito />
      <h1 className="font-display text-[19px] font-bold">Compra realizada</h1>
      <p className="text-[13px] text-hc-muted">
        Tu pedido de Auriculares Bluetooth X200 fue confirmado. Te avisaremos cuando el vendedor lo despache.
      </p>
      <EnlacePrimario to="/tienda">Volver a la tienda</EnlacePrimario>
    </main>
  )
}
