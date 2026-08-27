import { useNavigate } from 'react-router-dom'
import { Boton, Campo, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'

/**
 * Alta de bodega (Figma 78:325).
 */
export default function NuevaBodegaPage() {
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Nueva Bodega" volverA={ruta('bodegas')} />
      <form onSubmit={(evento) => { evento.preventDefault(); navigate(ruta('bodegas')) }}>
        <Campo etiqueta="Nombre de la bodega" placeholder="Ej: Bodega Central" />
        <Campo etiqueta="Ubicación" placeholder="Ej: San José, Costa Rica" />
        <Campo etiqueta="Encargado (opcional)" placeholder="Ej: Sofía Vargas" />
        <Boton type="submit">Guardar bodega</Boton>
      </form>
    </main>
  )
}
