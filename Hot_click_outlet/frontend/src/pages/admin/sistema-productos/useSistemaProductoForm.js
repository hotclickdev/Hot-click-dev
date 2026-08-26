import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { productService, denormalizeProduct } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { empresaService } from '@/services/empresaService'
import { useToast } from '@/components/ui/Toast'
import { FORM_VACIO } from './sistemaProductosHelpers'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import { tiendaEsPublica } from '@/utils/rutaTienda'

/**
 * Alta/edición Sistema: nombre + precio obligatorios; bodega automática.
 */
export function useSistemaProductoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const empresaSlug = useAuthStore((s) => s.empresaSlug)
  const editing = Boolean(id)
  const [form, setForm] = useState(FORM_VACIO)
  const [categories, setCategories] = useState([])
  const [bodegaId, setBodegaId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(editing)
  const [subiendo, setSubiendo] = useState(false)
  const [creado, setCreado] = useState(null)

  useEffect(() => {
    let vivo = true
    Promise.all([
      productService.getCategories().catch(() => ({ data: [] })),
      warehouseService.getAll().catch(() => ({ data: [] })),
      editing ? productService.getById(id) : Promise.resolve(null),
    ]).then(([catsRes, bodsRes, prodRes]) => {
      if (!vivo) return
      setCategories(Array.isArray(catsRes.data) ? catsRes.data : [])
      const bods = Array.isArray(bodsRes.data) ? bodsRes.data : (bodsRes.data?.content ?? [])
      const primera = bods[0]?.id ?? ''
      setBodegaId(primera)
      if (prodRes?.data) setForm(formDesdeApi(prodRes.data, primera))
    }).catch((err) => {
      console.error('[SistemaProductoForm] carga', err)
      toast({ message: 'No se pudo cargar el producto.', type: 'error' })
    }).finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [editing, id, toast])

  const setCampo = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))

  const subirFoto = useCallback(async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ message: 'La foto tiene que ser JPG o PNG.', type: 'error' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ message: 'La foto no puede superar 5 MB.', type: 'error' })
      return
    }
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await productService.uploadImage(fd)
      const url = r.data?.data?.url ?? r.data?.url ?? ''
      if (url) setForm((prev) => ({ ...prev, imagenUrl: url }))
    } catch {
      toast({ message: 'No se pudo subir la foto.', type: 'error' })
    } finally {
      setSubiendo(false)
    }
  }, [toast])

  const guardar = async (e) => {
    e.preventDefault()
    const error = errorFormulario(form)
    if (error) {
      toast({ message: error, type: 'error' })
      return
    }
    setSaving(true)
    try {
      const dto = dtoDesdeForm(form, bodegaId)
      if (editing) {
        await productService.update(id, dto)
        toast({ message: 'Producto actualizado', type: 'success' })
        navigate('/admin/productos')
        return
      }
      const res = await productService.create(dto)
      const data = res.data?.data ?? res.data
      setCreado({
        id: data?.id,
        nombre: form.nombre,
        imagenUrl: form.imagenUrl,
        tiendaPublica: await resolverTiendaPublica(),
      })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const agregarOtro = () => {
    setForm(FORM_VACIO)
    setCreado(null)
  }

  return { form, setCampo, categories, saving, loading, subiendo, subirFoto, guardar, editing, creado, agregarOtro, slug: empresaSlug }
}

function formDesdeApi(p, bodegaFallback) {
  return {
    nombre: p.nombre ?? '',
    descripcion: p.descripcion ?? '',
    precioVenta: p.precioVenta ?? p.precio ?? '',
    stock: p.stock ?? '',
    categoriaId: p.categoriaId ?? '',
    sku: p.sku ?? '',
    imagenUrl: p.imagenUrl ?? '',
    bodegaId: p.bodegaId ?? bodegaFallback ?? '',
  }
}

function errorFormulario(form) {
  if (!form.nombre.trim()) return 'Poné el nombre del producto.'
  if (!form.precioVenta || Number(form.precioVenta) < 0) return 'Poné un precio de venta.'
  return null
}

function dtoDesdeForm(form, bodegaId) {
  const dto = denormalizeProduct({
    ...form,
    precioCompra: 0,
    precioVenta: form.precioVenta,
    stock: form.stock,
    bodegaId: form.bodegaId || bodegaId,
    condicion: 'NUEVO',
    imagenes: form.imagenUrl ? [form.imagenUrl] : [],
  })
  if (form.imagenUrl) dto.imagenPrincipalUrl = form.imagenUrl
  return dto
}

async function resolverTiendaPublica() {
  const stored = useTenantStore.getState()
  if (stored.estadoEmpresa) return tiendaEsPublica(stored)
  try {
    const { data } = await empresaService.getPerfil()
    const e = data
    useTenantStore.getState().setEmpresaStatus({
      estadoEmpresa: e?.estadoEmpresa,
      visibilidadPublica: e?.visibilidadPublica,
    })
    return tiendaEsPublica(e)
  } catch (err) {
    console.error('[SistemaProductoForm] perfil', err)
    return false
  }
}
