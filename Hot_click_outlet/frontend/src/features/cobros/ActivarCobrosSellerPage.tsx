import { useSellerRuta } from '@/prototipo/compartido/SellerPlanContext'
import ActivarCobrosPage from './ActivarCobrosPage'

export default function ActivarCobrosSellerPage() {
  const ruta = useSellerRuta()
  return <ActivarCobrosPage volverA={ruta('opciones')} rutaSoporte={ruta('ayuda')} />
}
