import { useSellerRuta } from './SellerPlanContext'
import ContraEntregaConfigPage from './ContraEntregaConfigPage'

/** Pyme / Negocio Plus: misma configuración de contra entrega, volviendo a sus Opciones. */
export default function ContraEntregaSellerPage() {
  const ruta = useSellerRuta()
  return <ContraEntregaConfigPage volverA={ruta('opciones')} />
}
