import { Boton, IconoEstado } from './ui'
import { useSellerRuta } from './SellerPlanContext'

/**
 * Plan actualizado (Figma 158:393).
 */
export default function PlanActualizadoPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-32 text-center">
      <IconoEstado variante="ok" />
      <h1 className="font-display text-xl font-bold">Listo. Tu plan fue actualizado</h1>
      <p className="mt-2 text-sm text-hc-muted">
        Ya podés usar las funciones nuevas la próxima vez que inicies sesión.
      </p>
      <div className="mt-8">
        <Boton to={ruta('opciones')}>Volver a Opciones</Boton>
      </div>
    </main>
  )
}
