import EncargosPage from './EncargosPage'
import { useSellerRuta } from './SellerPlanContext'

export default function EncargosSellerPage() {
  const ruta = useSellerRuta()
  return <EncargosPage volverA={ruta()} />
}
