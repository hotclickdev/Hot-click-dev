import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'
import { useStickyState } from '@/hooks/useStickyState'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { RetryBanner } from '@/components/ui/RetryBanner'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import KardexDrawer from '@/components/pos/KardexDrawer'
import ImportExportBar from '@/components/admin/ImportExportBar'
import EmpresaProfileCard from '@/components/admin/EmpresaProfileCard'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import CarruselPanel from './productos/CarruselPanel'
import ProductoFormModal from './productos/ProductoFormModal'
import ProductosFilters from './productos/ProductosFilters'
import ProductosTable from './productos/ProductosTable'
import { useAdminProductsActions } from './productos/useAdminProductsActions'
import {
  COLUMNAS_EXPORT,
  COLUMNAS_IMPORT,
  EMPTY_FORM,
  PROD_PAGE_SIZE,
  filasExportProductos,
  filtrarProductos,
  mapImportRow,
  metaDescriptionAuto,
  metaTitleAuto,
} from './productos/productosHelpers'

export default function AdminProducts() {
  const { t } = useTranslation()
  const toast = useToast()
  const userRole = useAuthStore((s) => s.userRole)
  const isAdmin = userRole === 'ADMIN'
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

  const propsFiltros = {
    search,
    onSearch: (valor) => { setSearch(valor); setProdPage(0) },
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

  return (
    <>
      <div className="space-y-5">
        {loadError && !loading && (
          <RetryBanner message="Error al cargar los productos. Verificá tu conexión." onRetry={() => load(prodPage)} />
        )}

        <ProductosHeader
          t={t}
          filteredCount={filtered.length}
          totalProds={totalProds}
          products={products}
          bodegas={bodegas}
          onImport={handleImportBulk}
          onNuevo={openNew}
        />

        {isAdmin && (
          <CarruselPanel
            carruselSlots={carruselSlots}
            open={carruselOpen}
            onToggleOpen={() => setCarruselOpen((o) => !o)}
            onMover={handleCarruselMover}
            onQuitar={handleToggleCarrusel}
          />
        )}

        <ProductosFilters variante="mobile" {...propsFiltros} />

        {debouncedSearch && totalProds > PROD_PAGE_SIZE && (
          <AvisoBusquedaPaginada />
        )}

        <div className="flex gap-5">
          <ProductosFilters variante="aside" {...propsFiltros} />

          <div className="flex-1 min-w-0 space-y-4">
            <BuscadorDesktop search={search} onSearch={(valor) => { setSearch(valor); setProdPage(0) }} />

            {loading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : (
              <ProductosTable
                filtered={filtered}
                products={products}
                totalProds={totalProds}
                prodPage={prodPage}
                isAdmin={isAdmin}
                carruselSlots={carruselSlots}
                search={search}
                hasFilters={hasFilters}
                onToggleDestacado={handleToggleDestacado}
                onToggleCarrusel={handleToggleCarrusel}
                onEdit={openEdit}
                onKardex={setKardexProducto}
                onDelete={handleDelete}
                onClearFilters={clearFilters}
                onNuevo={openNew}
                onPage={setProdPage}
              />
            )}
          </div>
        </div>
      </div>

      <ProductoFormModal
        open={modalOpen}
        onClose={handleModalClose}
        form={form}
        setForm={setForm}
        categories={categories}
        bodegas={bodegas}
        marcas={marcas}
        editing={editing}
        saving={saving}
        seoOpen={seoOpen}
        setSeoOpen={setSeoOpen}
        seoAutoTitle={seoAutoTitle}
        setSeoAutoTitle={setSeoAutoTitle}
        seoAutoDesc={seoAutoDesc}
        setSeoAutoDesc={setSeoAutoDesc}
        onSubmit={handleSave}
        setModalOpen={setModalOpen}
      />

      <ConfirmModal
        open={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onConfirm={() => { setShowDiscardModal(false); setModalOpen(false); editInitialFormRef.current = null }}
        title="Cambios sin guardar"
        message="Hay cambios sin guardar en este producto. ¿Salir sin guardar?"
        confirmLabel="Descartar cambios"
        danger={false}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar producto"
        message={`¿Eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
      />

      {kardexProducto && (
        <KardexDrawer producto={kardexProducto} onClose={() => setKardexProducto(null)} />
      )}
    </>
  )
}

function ProductosHeader({ t, filteredCount, totalProds, products, bodegas, onImport, onNuevo }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>{t('admin.products.title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{filteredCount} de {totalProds} productos</p>
        </div>
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>Cuenta</span>
          <EmpresaProfileCard totalProductos={totalProds} />
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <ImportExportBar
          data={filasExportProductos(products)}
          columns={COLUMNAS_EXPORT}
          filename="productos"
          sheetName="Productos"
          importColumns={COLUMNAS_IMPORT}
          mapImportRow={(row) => mapImportRow(row, bodegas[0]?.id)}
          onImport={onImport}
        />
        <Link
          to="/admin/productos/carga-masiva"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--hc-surface-2)]"
          style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
          </svg>
          Carga masiva
        </Link>
        <Button onClick={onNuevo}>+ {t('admin.products.new')}</Button>
      </div>
    </div>
  )
}

function AvisoBusquedaPaginada() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
      style={{ backgroundColor: 'rgba(23,71,168,0.06)', border: '1px solid rgba(23,71,168,0.18)', color: '#7fa0ff' }}>
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Buscando en los {PROD_PAGE_SIZE} productos de la página actual. Para buscar en todo el catálogo, limpiá el texto y navegá por páginas.
    </div>
  )
}

function BuscadorDesktop({ search, onSearch }) {
  return (
    <div className="relative hidden md:block">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="text"
        placeholder="Buscar por nombre..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full h-10 pl-10 pr-4 rounded-xl text-sm focus:outline-none transition-colors"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
      />
    </div>
  )
}
