import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { productService, denormalizeProduct } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { marcaService } from '@/services/marcaService'
import { useToast } from '@/components/ui/Toast'
import {
  EMPTY_FORM,
  formDesdeProducto,
  idDesdeRespuestaProducto,
  mensajeErrorProducto,
  urlsDesdeImagenes,
  type AdminProductoForm,
  type BodegaAdmin,
  type CategoriaAdmin,
  type MarcaAdmin,
  type ProductoAdmin,
} from '../productos/productosHelpers'
import { idEmpresaOpcional } from './EmpresaDestinoSelect'
import type { EmpresaProductoTab } from './empresasHelpers'
import type { Id } from '@/types/api'

function listaDesdeRespuesta<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && 'content' in data) {
    return ((data as { content?: T[] }).content ?? [])
  }
  return []
}

export function useEmpresaProductoEditor(empresaId: Id | undefined, onGuardado: () => void) {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AdminProductoForm>(EMPTY_FORM)
  const [editing, setEditing] = useState<ProductoAdmin | null>(null)
  const [categories, setCategories] = useState<CategoriaAdmin[]>([])
  const [bodegas, setBodegas] = useState<BodegaAdmin[]>([])
  const [marcas, setMarcas] = useState<MarcaAdmin[]>([])
  const [seoOpen, setSeoOpen] = useState(false)
  const [seoAutoTitle, setSeoAutoTitle] = useState(true)
  const [seoAutoDesc, setSeoAutoDesc] = useState(true)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const editInitialFormRef = useRef<string | null>(null)

  useEffect(() => {
    if (!empresaId) return
    let vivo = true
    Promise.all([
      productService.getCategories().catch(() => ({ data: [] })),
      warehouseService.getAll({ empresaId }).catch(() => ({ data: [] })),
      marcaService.getAll().catch(() => ({ data: [] })),
    ]).then(([cats, bods, mars]) => {
      if (!vivo) return
      setCategories(listaDesdeRespuesta<CategoriaAdmin>(cats.data))
      setBodegas(listaDesdeRespuesta<BodegaAdmin>(bods.data))
      setMarcas(listaDesdeRespuesta<MarcaAdmin>(mars.data))
    }).catch((err: unknown) => {
      console.error('[EmpresaWorkspace] catálogo', err)
    })
    return () => { vivo = false }
  }, [empresaId])

  const openNew = useCallback(() => {
    setEditing(null)
    editInitialFormRef.current = null
    setSeoAutoTitle(true)
    setSeoAutoDesc(true)
    setSeoOpen(false)
    setForm({ ...EMPTY_FORM, bodegaId: bodegas[0]?.id ?? '' })
    setModalOpen(true)
  }, [bodegas])

  const openEdit = useCallback(async (producto: EmpresaProductoTab) => {
    setSeoAutoTitle(false)
    setSeoAutoDesc(false)
    setSeoOpen(false)
    try {
      const { data } = await productService.getById(producto.id)
      if (!data) {
        toast({ message: 'No se pudo cargar el producto', type: 'error' })
        return
      }
      const admin = data as ProductoAdmin
      const inicial = formDesdeProducto(admin, bodegas)
      setEditing(admin)
      setForm(inicial)
      setModalOpen(true)
      const { data: imgs } = await productService.getImagenes(producto.id)
      const urls = urlsDesdeImagenes(imgs)
      if (urls.length > 0) {
        setForm((prev) => {
          const updated = { ...prev, imagenes: urls }
          editInitialFormRef.current = JSON.stringify(updated)
          return updated
        })
      } else {
        editInitialFormRef.current = JSON.stringify(inicial)
      }
    } catch (err: unknown) {
      toast({ message: mensajeErrorProducto(err, 'No se pudo cargar el producto'), type: 'error' })
    }
  }, [bodegas, toast])

  const handleSave = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!form.categoriaId) {
      toast({ message: 'Selecciona una categoría', type: 'error' })
      return
    }
    if (!form.bodegaId && bodegas.length > 0) {
      toast({ message: 'Selecciona una bodega', type: 'error' })
      return
    }
    const empresaParam = idEmpresaOpcional(empresaId)
    if (!editing && empresaParam == null) {
      toast({ message: 'Elegí la empresa a la que se van a asignar los productos.', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const dto = denormalizeProduct(form)
      if (form.imagenes.length > 0) dto.imagenPrincipalUrl = form.imagenes[0]
      let productoId
      if (editing) {
        await productService.update(editing.id, dto)
        productoId = editing.id
        toast({ message: 'Producto actualizado', type: 'success' })
      } else {
        const res = await productService.create(dto, { params: { empresaId: empresaParam } })
        productoId = idDesdeRespuestaProducto(res.data)
        toast({ message: 'Producto creado', type: 'success' })
      }
      if (productoId && form.imagenes.length > 0) {
        await productService.sincronizarImagenes(productoId, form.imagenes)
      }
      editInitialFormRef.current = null
      setModalOpen(false)
      onGuardado()
    } catch (err: unknown) {
      toast({ message: mensajeErrorProducto(err, 'Error al guardar'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [bodegas.length, editing, empresaId, form, onGuardado, toast])

  const handleModalClose = useCallback(() => {
    const sucio = editing && editInitialFormRef.current
      ? JSON.stringify(form) !== editInitialFormRef.current
      : false
    if (sucio) {
      setShowDiscardModal(true)
      return
    }
    setModalOpen(false)
  }, [editing, form])

  return {
    modalOpen,
    setModalOpen,
    saving,
    form,
    setForm,
    editing,
    categories,
    bodegas,
    marcas,
    seoOpen,
    setSeoOpen,
    seoAutoTitle,
    setSeoAutoTitle,
    seoAutoDesc,
    setSeoAutoDesc,
    showDiscardModal,
    setShowDiscardModal,
    openNew,
    openEdit,
    handleSave,
    handleModalClose,
  }
}
