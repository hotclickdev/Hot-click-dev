import RecoleccionPage from './RecoleccionPage'
import { useSellerRuta } from './SellerPlanContext'

export default function RecoleccionSellerPage() {
  const ruta = useSellerRuta()
  return <RecoleccionPage volverA={ruta()} />
}
