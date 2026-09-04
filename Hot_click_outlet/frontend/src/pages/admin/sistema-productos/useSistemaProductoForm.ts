import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { productService, denormalizeProduct } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { empresaService } from '@/services/empresaService'
import { useToast } from '@/components/ui/Toast'
import { FORM_VACIO, type FormSistemaProducto } from './sistemaProductosHelpers'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import { tiendaEsPublica } from '@/utils/rutaTienda'
import { mensajeErrorProducto, accionErrorProducto } from '../productos/productosHelpers'
import type { CategoriaAdmin, BodegaAdmin } from '../productos/productosHelpers'
import type { Id } from '@/types/api'
import type { Producto } from '@/types/producto'

export type ProductoCreadoSistema = {
  id?: Id
  nombre: string
  imagenUrl: string
  tiendaPublica: boolean
}

/**
 * Alta/edición Sistema: nombre + precio obligatorios; bodega automática.
 */
export function useSistemaProductoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const empresaSlug = useAuthStore((s) => s.empresaSlug)
  const editing = Boolean(id)
  const [form, setForm] = useState<FormSistemaProducto>(FORM_VACIO)
  const [categories, setCategories] = useState<CategoriaAdmin[]>([])
  const [bodegaId, setBodegaId] = useState<Id | ''>('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(editing)
  const [subiendo, setSubiendo] = useState(false)
  const [creado, setCreado] = useState<ProductoCreadoSistema | null>(null)

  useEffect(() => {
    let vivo = true
    Promise.all([
      productService.getCategories().catch(() => ({ data: [] })),
      warehouseService.getAll().catch(() => ({ data: [] })),
      editing && id ? productService.getById(id) : Promise.resolve(null),
    ]).then(([catsRes, bodsRes, prodRes]) => {
      if (!vivo) return
      setCategories(Array.isArray(catsRes.data) ? catsRes.data as CategoriaAdmin[] : [])
      const bods = listaBodegas(bodsRes.data)
      const primera = bods[0]?.id ?? ''
      setBodegaId(primera)
      if (prodRes?.data) setForm(formDesdeApi(prodRes.data, primera))
    }).catch((err: unknown) => {
      console.error('[SistemaProductoForm] carga', err)
      toast({ message: 'No se pudo cargar el producto.', type: 'error' })
    }).finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [editing, id, toast])

  const setCampo = (campo: keyof FormSistemaProducto) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))

  const subirFoto = useCallback(async (file?: File) => {
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
      const url = urlDesdeUpload(r.data)
      if (url) setForm((prev) => ({ ...prev, imagenUrl: url }))
    } catch {
      toast({ message: 'No se pudo subir la foto.', type: 'error' })
    } finally {
      setSubiendo(false)
    }
  }, [toast])

  const guardar = async (e: FormEvent) => {
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
        await productService.update(id as Id, dto)
        toast({ message: 'Producto actualizado', type: 'success' })
        navigate('/admin/productos')
        return
      }
      const res = await productService.create(dto)
      const data = cuerpoProducto(res.data)
      setCreado({
        id: data?.id,
        nombre: form.nombre,
        imagenUrl: form.imagenUrl,
        tiendaPublica: await resolverTiendaPublica(),
      })
    } catch (err: unknown) {
      const msg = mensajeErrorProducto(err, 'Error al guardar')
      const accion = accionErrorProducto(err)
      toast({
        message: msg,
        type: accion ? 'warning' : 'error',
        accion: accion && { label: accion.label, onClick: () => navigate(accion.ruta) },
      })
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

function listaBodegas(data: unknown): BodegaAdmin[] {
  if (Array.isArray(data)) return data as BodegaAdmin[]
  if (data && typeof data === 'object' && 'content' in data) {
    return (data as { content?: BodegaAdmin[] }).content ?? []
  }
  return []
}

function urlDesdeUpload(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const cuerpo = data as { data?: { url?: unknown }; url?: unknown }
  if (typeof cuerpo.data?.url === 'string') return cuerpo.data.url
  if (typeof cuerpo.url === 'string') return cuerpo.url
  return ''
}

function cuerpoProducto(data: unknown): { id?: Id } | undefined {
  if (!data || typeof data !== 'object') return undefined
  const cuerpo = data as { data?: { id?: Id }; id?: Id }
  return cuerpo.data ?? cuerpo
}

function formDesdeApi(p: Producto, bodegaFallback: Id | ''): FormSistemaProducto {
  return {
    nombre: p.nombre ?? '',
    descripcion: p.descripcion ?? '',
    precioVenta: p.precioVenta ?? p.precio ?? '',
    stock: p.stock ?? '',
    categoriaId: p.categoriaId != null ? String(p.categoriaId) : '',
    sku: p.sku ?? '',
    imagenUrl: p.imagenUrl ?? '',
    bodegaId: p.bodegaId ?? bodegaFallback ?? '',
    visibleCatalogo: p.visibleCatalogo !== false,
  }
}

function errorFormulario(form: FormSistemaProducto) {
  if (!form.nombre.trim()) return 'Poné el nombre del producto.'
  if (!form.precioVenta || Number(form.precioVenta) < 0) return 'Poné un precio de venta.'
  return null
}

function dtoDesdeForm(form: FormSistemaProducto, bodegaId: Id | '') {
  const payload = {
    ...form,
    precioCompra: 0,
    precioVenta: form.precioVenta,
    stock: form.stock,
    bodegaId: form.bodegaId || bodegaId,
    condicion: 'NUEVO',
    imagenes: form.imagenUrl ? [form.imagenUrl] : [],
  }
  const dto = denormalizeProduct(payload)
  dto.visibleCatalogo = form.visibleCatalogo
  if (form.imagenUrl) dto.imagenPrincipalUrl = form.imagenUrl
  return dto
}

async function resolverTiendaPublica() {
  const stored = useTenantStore.getState()
  if (stored.estadoEmpresa) {
    return tiendaEsPublica({
      estadoEmpresa: stored.estadoEmpresa,
      visibilidadPublica: stored.visibilidadPublica ?? undefined,
    })
  }
  try {
    const { data } = await empresaService.getPerfil()
    const e = perfilEmpresa(data)
    useTenantStore.getState().setEmpresaStatus({
      estadoEmpresa: e.estadoEmpresa,
      visibilidadPublica: e.visibilidadPublica,
    })
    return tiendaEsPublica(e)
  } catch (err: unknown) {
    console.error('[SistemaProductoForm] perfil', err)
    return false
  }
}

function perfilEmpresa(data: unknown): { estadoEmpresa?: string; visibilidadPublica?: boolean } {
  if (!data || typeof data !== 'object') return {}
  const o = data as { estadoEmpresa?: unknown; visibilidadPublica?: unknown }
  return {
    estadoEmpresa: typeof o.estadoEmpresa === 'string' ? o.estadoEmpresa : undefined,
    visibilidadPublica: typeof o.visibilidadPublica === 'boolean' ? o.visibilidadPublica : undefined,
  }
}
