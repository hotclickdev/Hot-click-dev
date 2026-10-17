import { useSellerRuta } from '@/prototipo/compartido/SellerPlanContext'
import LiquidacionPage from './LiquidacionPage'

export default function LiquidacionSellerPage() {
  const ruta = useSellerRuta()
  return <LiquidacionPage volverA={ruta('opciones')} />
}
