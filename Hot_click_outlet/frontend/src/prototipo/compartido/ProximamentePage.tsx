import { Boton, EncabezadoPagina, IconoEstado } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import EntradaPagina from './motion/EntradaPagina'

/**
 * Función en desarrollo (Figma 61:554). Sin emoji: reloj CSS.
 */
export default function ProximamentePage() {
  const ruta = useSellerRuta()
  return (
    <EntradaPagina>
      <main className="px-5 pb-8 pt-[60px] text-center">
        <EncabezadoPagina titulo="" volverA={ruta('opciones')} />
        <IconoEstado variante="espera" />
        <h1 className="font-display text-xl font-bold">Próximamente</h1>
        <p className="mt-2 text-sm text-hc-muted">
          Esta función está en desarrollo. Muy pronto vas a poder usarla desde acá.
        </p>
        <div className="mt-8">
          <Boton variante="contorno" to={ruta('opciones')}>Volver</Boton>
        </div>
      </main>
    </EntradaPagina>
  )
}
