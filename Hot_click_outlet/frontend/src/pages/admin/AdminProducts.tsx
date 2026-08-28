import ProductosPageView from './productos/ProductosPageView'
import { useAdminProductsPage } from './productos/useAdminProductsPage'

export default function AdminProducts() {
  const page = useAdminProductsPage()
  return <ProductosPageView {...page} />
}
