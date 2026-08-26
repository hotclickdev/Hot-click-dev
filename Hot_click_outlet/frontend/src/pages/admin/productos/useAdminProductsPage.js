import { useState, useEffect, useMemo, useRef } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { useStickyState } from '@/hooks/useStickyState'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import { useAdminProductsActions } from './useAdminProductsActions'
import { toProductosPageViewProps } from './toProductosPageViewProps'
import {
  EMPTY_FORM,
  filtrarProductos,
  metaDescriptionAuto,
  metaTitleAuto,
} from './productosHelpers'

/**
 * Estado, efectos y handlers de la página admin de productos.
 */
export function useAdminProductsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const userRole = useAuthStore((s) => s.userRole)
  const isAdmin = userRole === 'ADMIN'
  // El dueño ve SistemaProductos. Esta página solo la usa ADMIN/GERENTE.
  const vistaSimple = false
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [bodegas, setBodegas] = useState([])
  const [marcas, setMarcas] = useState([])
  const [loading, setLoading] = useState(true)
  const [prodPage, setProdPage] = useState(0)
  const [totalProds, setTotalProds] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useStickyState('hc-prod-search', '')
  const [filterCat, setFilterCat] = useStickyState('hc-prod-cat', '')
  const [filterCond, setFilterCond] = useStickyState('hc-prod-cond', '')
  const [filterStock, setFilterStock] = useStickyState('hc-prod-stock', '')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const editInitialFormRef = useRef(null)
  const debouncedSearch = useDebounce(search, 280)
  const [carruselOpen, setCarruselOpen] = useState(true)
  const [seoOpen, setSeoOpen] = useState(false)
  const [seoAutoTitle, setSeoAutoTitle] = useState(true)
  const [seoAutoDesc, setSeoAutoDesc] = useState(true)
  const [kardexProducto, setKardexProducto] = useState(null)

  const carruselSlots = products
    .filter((p) => p.enCarrusel)
    .sort((a, b) => (a.ordenCarrusel ?? 0) - (b.ordenCarrusel ?? 0))
    .slice(0, 5)

  const {
    load,
    openNew,
    openEdit,
    handleToggleCarrusel,
    handleCarruselMover,
    handleToggleDestacado,
    handleSave,
    handleDelete,
    confirmDelete,
    handleModalClose,
    handleImportBulk,
    handleOfertaRapida,
    handleOcultar,
  } = useAdminProductsActions({
    prodPage,
    bodegas,
    products,
    carruselSlots,
    form,
    editing,
    deleteTarget,
    editInitialFormRef,
    toast,
    setProducts,
    setTotalProds,
    setCategories,
    setBodegas,
    setMarcas,
    setLoading,
    setLoadError,
    setEditing,
    setForm,
    setModalOpen,
    setSaving,
    setDeleteTarget,
    setSeoAutoTitle,
    setSeoAutoDesc,
    setSeoOpen,
    setShowDiscardModal,
  })

  useEffect(() => { load(prodPage) }, [prodPage]) // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- carga paginada

  useEffect(() => {
    if (!seoAutoTitle || !modalOpen) return
    setForm((p) => ({ ...p, metaTitle: metaTitleAuto(p.nombre) })) // eslint-disable-line react-hooks/set-state-in-effect -- SEO derivado del nombre
  }, [form.nombre, seoAutoTitle, modalOpen])

  useEffect(() => {
    if (!seoAutoDesc || !modalOpen) return
    setForm((p) => ({ ...p, metaDescription: metaDescriptionAuto(p.descripcion, p.precioVenta) })) // eslint-disable-line react-hooks/set-state-in-effect -- SEO derivado de desc/precio
  }, [form.descripcion, form.precioVenta, seoAutoDesc, modalOpen])

  const filtered = useMemo(() => filtrarProductos({
    products,
    search: debouncedSearch,
    filterCat,
    filterCond,
    filterStock,
    categories,
  }), [products, debouncedSearch, filterCat, filterCond, filterStock, categories])

  const hasFilters = filterCat || filterCond || filterStock || !!search
  const clearFilters = () => { setFilterCat(''); setFilterCond(''); setFilterStock(''); setSearch(''); setProdPage(0) }
  const onSearch = (valor) => { setSearch(valor); setProdPage(0) }

  const propsFiltros = {
    search,
    onSearch,
    filterCat,
    onFilterCat: setFilterCat,
    filterCond,
    onFilterCond: setFilterCond,
    filterStock,
    onFilterStock: setFilterStock,
    categories,
    hasFilters,
    onClear: clearFilters,
  }

  return toProductosPageViewProps({
    t, isAdmin, vistaSimple, loadError, loading, load, prodPage, filtered, totalProds,
    products, bodegas, categories, marcas, handleImportBulk, openNew, openEdit,
    carruselSlots, carruselOpen, setCarruselOpen, handleCarruselMover,
    handleToggleCarrusel, handleToggleDestacado, propsFiltros, debouncedSearch,
    search, onSearch, handleDelete, handleSave, confirmDelete, handleModalClose,
    modalOpen, setModalOpen, form, setForm, editing, saving, seoOpen, setSeoOpen,
    seoAutoTitle, setSeoAutoTitle, seoAutoDesc, setSeoAutoDesc, showDiscardModal,
    setShowDiscardModal, deleteTarget, setDeleteTarget, kardexProducto,
    setKardexProducto, editInitialFormRef, clearFilters, hasFilters, setProdPage,
    handleOfertaRapida, handleOcultar,
  })
}
