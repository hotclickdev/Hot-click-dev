import type { Dispatch, FormEvent, MutableRefObject, SetStateAction } from 'react'
import type { TFunction } from 'i18next'
import type {
  AdminProductoForm,
  BodegaAdmin,
  CategoriaAdmin,
  DeleteTargetProducto,
  MarcaAdmin,
  ProductoAdmin,
} from './productosHelpers'
import type { ProductosFiltrosValores } from './ProductosFilters'

export type ProductosPageCtx = {
  t: TFunction
  isAdmin: boolean
  vistaSimple: boolean
  loadError: boolean
  loading: boolean
  load: (page?: number) => void | Promise<void>
  prodPage: number
  filtered: ProductoAdmin[]
  totalProds: number
  products: ProductoAdmin[]
  bodegas: BodegaAdmin[]
  categories: CategoriaAdmin[]
  marcas: MarcaAdmin[]
  handleImportBulk: (rows: unknown[]) => void | Promise<void>
  openNew: () => void
  openEdit: (p: ProductoAdmin) => void
  carruselSlots: ProductoAdmin[]
  carruselOpen: boolean
  setCarruselOpen: Dispatch<SetStateAction<boolean>>
  handleCarruselMover: (p: ProductoAdmin, dir: number) => void
  handleToggleCarrusel: (p: ProductoAdmin) => void
  handleToggleDestacado: (p: ProductoAdmin) => void
  propsFiltros: ProductosFiltrosValores
  debouncedSearch: string
  search: string
  onSearch: (valor: string) => void
  handleDelete: (id: number, nombre: string) => void
  handleSave: (e: FormEvent) => void
  confirmDelete: () => void
  handleModalClose: () => void
  modalOpen: boolean
  setModalOpen: Dispatch<SetStateAction<boolean>>
  form: AdminProductoForm
  setForm: Dispatch<SetStateAction<AdminProductoForm>>
  editing: ProductoAdmin | null
  saving: boolean
  seoOpen: boolean
  setSeoOpen: Dispatch<SetStateAction<boolean>>
  seoAutoTitle: boolean
  setSeoAutoTitle: Dispatch<SetStateAction<boolean>>
  seoAutoDesc: boolean
  setSeoAutoDesc: Dispatch<SetStateAction<boolean>>
  showDiscardModal: boolean
  setShowDiscardModal: Dispatch<SetStateAction<boolean>>
  deleteTarget: DeleteTargetProducto | null
  setDeleteTarget: Dispatch<SetStateAction<DeleteTargetProducto | null>>
  kardexProducto: ProductoAdmin | null
  setKardexProducto: Dispatch<SetStateAction<ProductoAdmin | null>>
  editInitialFormRef: MutableRefObject<string | null>
  clearFilters: () => void
  hasFilters: boolean
  setProdPage: Dispatch<SetStateAction<number>>
  handleOfertaRapida: (p: ProductoAdmin) => void
  handleOcultar: (p: ProductoAdmin) => void
}

/**
 * Arma las props de ProductosPageView desde el estado de la página.
 */
export function toProductosPageViewProps(ctx: ProductosPageCtx) {
  const {
    t,
    isAdmin,
    loadError,
    loading,
    load,
    prodPage,
    filtered,
    totalProds,
    products,
    bodegas,
    categories,
    marcas,
    handleImportBulk,
    openNew,
    openEdit,
    carruselSlots,
    carruselOpen,
    setCarruselOpen,
    handleCarruselMover,
    handleToggleCarrusel,
    handleToggleDestacado,
    propsFiltros,
    debouncedSearch,
    search,
    onSearch,
    handleDelete,
    handleSave,
    confirmDelete,
    handleModalClose,
    modalOpen,
    setModalOpen,
    form,
    setForm,
    editing,
    saving,
    seoOpen,
    setSeoOpen,
    seoAutoTitle,
    setSeoAutoTitle,
    seoAutoDesc,
    setSeoAutoDesc,
    showDiscardModal,
    setShowDiscardModal,
    deleteTarget,
    setDeleteTarget,
    kardexProducto,
    setKardexProducto,
    editInitialFormRef,
    clearFilters,
    hasFilters,
    setProdPage,
  } = ctx

  return {
    loadError,
    loading,
    onRetry: () => load(prodPage),
    header: {
      t,
      filteredCount: filtered.length,
      totalProds,
      products,
      bodegas,
      onImport: handleImportBulk,
      onNuevo: openNew,
      vistaSimple: ctx.vistaSimple,
    },
    carrusel: {
      isAdmin,
      slots: carruselSlots,
      open: carruselOpen,
      onToggleOpen: () => setCarruselOpen((o) => !o),
      onMover: handleCarruselMover,
      onQuitar: handleToggleCarrusel,
    },
    listado: {
      propsFiltros,
      debouncedSearch,
      totalProds,
      search,
      onSearch,
      loading,
      filtered,
      products,
      prodPage,
      isAdmin,
      carruselSlots,
      hasFilters,
      onToggleDestacado: handleToggleDestacado,
      onToggleCarrusel: handleToggleCarrusel,
      onEdit: openEdit,
      onKardex: setKardexProducto,
      onDelete: handleDelete,
      onOferta: ctx.handleOfertaRapida,
      onOcultar: ctx.handleOcultar,
      onClearFilters: clearFilters,
      onNuevo: openNew,
      onPage: setProdPage,
      vistaSimple: ctx.vistaSimple,
    },
    formModal: {
      open: modalOpen,
      onClose: handleModalClose,
      form,
      setForm,
      categories,
      bodegas,
      marcas,
      editing,
      saving,
      seoOpen,
      setSeoOpen,
      seoAutoTitle,
      setSeoAutoTitle,
      seoAutoDesc,
      setSeoAutoDesc,
      onSubmit: handleSave,
      setModalOpen,
    },
    confirms: {
      showDiscardModal,
      onCloseDiscard: () => setShowDiscardModal(false),
      onConfirmDiscard: () => { setShowDiscardModal(false); setModalOpen(false); editInitialFormRef.current = null },
      deleteTarget,
      onCloseDelete: () => setDeleteTarget(null),
      onConfirmDelete: confirmDelete,
      kardexProducto,
      onCloseKardex: () => setKardexProducto(null),
    },
  }
}
