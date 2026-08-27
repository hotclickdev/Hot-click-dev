import EnlacePrimario from '../ui/EnlacePrimario'
import IconoExito from '../ui/IconoExito'

/**
 * Plan actualizado (Figma 158:190).
 */
export default function PlanActualizadoPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 px-[22px] pb-16 pt-36 text-center">
      <IconoExito />
      <h1 className="font-display text-lg font-bold">Listo. Tu plan fue actualizado</h1>
      <p className="text-[13px] text-hc-muted">
        Ya podés usar las funciones nuevas la próxima vez que inicies sesión.
      </p>
      <EnlacePrimario to="/opciones">Volver a Opciones</EnlacePrimario>
    </main>
  )
}
