import { RetryBanner } from '@/components/ui/RetryBanner'
import CarruselPanel from './CarruselPanel'
import ProductoFormModal from './ProductoFormModal'
import ProductosHeader from './ProductosHeader'
import ProductosListado from './ProductosListado'
import ProductosConfirmModals from './ProductosConfirmModals'
import type { ProductosHeaderProps } from './ProductosHeader'
import type { ProductosListadoProps } from './ProductosListado'
import type { ProductoFormModalProps } from './ProductoFormModal'
import type { ProductosConfirmModalsProps } from './ProductosConfirmModals'
import type { ProductoAdmin } from './productosHelpers'

export type ProductosPageViewProps = {
  loadError: boolean
  loading: boolean
  onRetry: () => void
  header: ProductosHeaderProps
  carrusel: {
    isAdmin: boolean
    slots: ProductoAdmin[]
    open: boolean
    onToggleOpen: () => void
    onMover: (p: ProductoAdmin, dir: number) => void
    onQuitar: (p: ProductoAdmin) => void
  }
  listado: ProductosListadoProps
  formModal: ProductoFormModalProps
  confirms: ProductosConfirmModalsProps
}

/**
 * Vista de admin productos: banner, header, carrusel, listado y modales.
 */
export default function ProductosPageView({
  loadError,
  loading,
  onRetry,
  header,
  carrusel,
  listado,
  formModal,
  confirms,
}: ProductosPageViewProps) {
  return (
    <>
      <div className="space-y-5">
        {loadError && !loading && (
          <RetryBanner message="Error al cargar los productos. Verificá tu conexión." onRetry={onRetry} />
        )}

        <ProductosHeader
          t={header.t}
          filteredCount={header.filteredCount}
          totalProds={header.totalProds}
          products={header.products}
          bodegas={header.bodegas}
          onImport={header.onImport}
          onNuevo={header.onNuevo}
          vistaSimple={header.vistaSimple}
        />

        {carrusel.isAdmin && (
          <CarruselPanel
            carruselSlots={carrusel.slots}
            open={carrusel.open}
            onToggleOpen={carrusel.onToggleOpen}
            onMover={carrusel.onMover}
            onQuitar={carrusel.onQuitar}
          />
        )}

        <ProductosListado {...listado} />
      </div>

      <ProductoFormModal
        open={formModal.open}
        onClose={formModal.onClose}
        form={formModal.form}
        setForm={formModal.setForm}
        categories={formModal.categories}
        bodegas={formModal.bodegas}
        marcas={formModal.marcas}
        editing={formModal.editing}
        saving={formModal.saving}
        seoOpen={formModal.seoOpen}
        setSeoOpen={formModal.setSeoOpen}
        seoAutoTitle={formModal.seoAutoTitle}
        setSeoAutoTitle={formModal.setSeoAutoTitle}
        seoAutoDesc={formModal.seoAutoDesc}
        setSeoAutoDesc={formModal.setSeoAutoDesc}
        onSubmit={formModal.onSubmit}
        setModalOpen={formModal.setModalOpen}
      />

      <ProductosConfirmModals {...confirms} />
    </>
  )
}
