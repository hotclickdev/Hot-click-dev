import EmpresaDetail from './empresas/EmpresaDetail'
import ProductoFormModal from './productos/ProductoFormModal'
import ProductosConfirmModals from './productos/ProductosConfirmModals'
import { useEmpresaWorkspace } from './empresas/useEmpresaWorkspace'
import { useEmpresaProductoEditor } from './empresas/useEmpresaProductoEditor'

export default function AdminEmpresaWorkspace() {
  const w = useEmpresaWorkspace()
  const editor = useEmpresaProductoEditor(w.selected?.id, () => { void w.recargarProductos() })

  if (w.loading || !w.selected) {
    return <p className="py-16 text-center text-sm text-hc-muted">Cargando negocio…</p>
  }

  return (
    <>
      <EmpresaDetail
        selected={w.selected}
        detail={w.detail}
        saving={w.saving}
        impersonarLoading={w.impersonarLoading}
        tab={w.tab}
        tabProductos={w.tabProductos}
        tabPedidos={w.tabPedidos}
        tabEquipo={w.tabEquipo}
        tabLoading={w.tabLoading}
        busquedaProducto={w.busquedaProducto}
        onBusquedaProducto={w.setBusquedaProducto}
        onTab={w.onTab}
        onCambiarPlan={w.cambiarPlan}
        onCambiarEstado={w.cambiarEstado}
        onToggleVisibilidad={w.toggleVisibilidad}
        onImpersonar={w.impersonar}
        savingProductoId={w.savingProductoId}
        onToggleVisibilidadProducto={w.toggleVisibilidadProducto}
        onEditarProducto={(p) => { void editor.openEdit(p) }}
        onNuevoProducto={editor.openNew}
      />
      <ProductoFormModal
        open={editor.modalOpen}
        onClose={editor.handleModalClose}
        form={editor.form}
        setForm={editor.setForm}
        categories={editor.categories}
        bodegas={editor.bodegas}
        marcas={editor.marcas}
        editing={editor.editing}
        saving={editor.saving}
        seoOpen={editor.seoOpen}
        setSeoOpen={editor.setSeoOpen}
        seoAutoTitle={editor.seoAutoTitle}
        setSeoAutoTitle={editor.setSeoAutoTitle}
        seoAutoDesc={editor.seoAutoDesc}
        setSeoAutoDesc={editor.setSeoAutoDesc}
        onSubmit={editor.handleSave}
        setModalOpen={editor.setModalOpen}
      />
      <ProductosConfirmModals
        showDiscardModal={editor.showDiscardModal}
        onCloseDiscard={() => editor.setShowDiscardModal(false)}
        onConfirmDiscard={() => {
          editor.setShowDiscardModal(false)
          editor.setModalOpen(false)
        }}
        deleteTarget={null}
        onCloseDelete={() => undefined}
        onConfirmDelete={() => undefined}
        kardexProducto={null}
        onCloseKardex={() => undefined}
      />
    </>
  )
}
