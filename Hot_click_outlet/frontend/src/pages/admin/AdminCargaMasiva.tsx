import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { productService } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import {
  LIMIT_DEFAULT,
  LIMIT_EXTENDED,
  EXTENDED_ROLES,
  categoriasDesdeRespuesta,
  idDesdeProductoCreado,
  mensajeErrorCarga,
  urlDesdeUpload,
  type CargaProgress,
  type CategoriaCarga,
  type ProductoDraft,
} from './carga-masiva/cargaMasivaHelpers'
import { IconArrow } from './carga-masiva/cargaMasivaIcons'
import StepSubida from './carga-masiva/StepSubida'
import StepWizard from './carga-masiva/StepWizard'
import StepResumen from './carga-masiva/StepResumen'
import StepBar from './carga-masiva/StepBar'

export default function AdminCargaMasiva() {
  const navigate = useNavigate()
  const toast = useToast()
  const userRole = useAuthStore((s) => s.userRole)
  const limit = EXTENDED_ROLES.has(userRole ?? '') ? LIMIT_EXTENDED : LIMIT_DEFAULT

  const [step, setStep] = useState(1)
  const [drafts, setDrafts] = useState<ProductoDraft[]>([])
  const [editIdx, setEditIdx] = useState(0)
  const [categories, setCategories] = useState<CategoriaCarga[]>([])
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<CargaProgress>({ done: 0, total: 0 })

  // Ref para poder revocar todos los object URLs al desmontar
  const draftsRef = useRef<ProductoDraft[]>([])
  useEffect(() => { draftsRef.current = drafts }, [drafts])

  useEffect(() => {
    productService.getCategories()
      .then(r => setCategories(categoriasDesdeRespuesta(r.data)))
      .catch(() => toast({ message: 'Error al cargar categorías', type: 'error' }))
    return () => {
      draftsRef.current.forEach(d => {
        URL.revokeObjectURL(d.mainPreview)
        d.extraPreviews.forEach(u => URL.revokeObjectURL(u))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  const updateDraft = (idx: number, fields: Partial<ProductoDraft>) => {
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, ...fields } : d))
  }

  const handleContinuar = (newDrafts: ProductoDraft[]) => {
    setDrafts(newDrafts)
    setStep(2)
  }

  const handleFinalizar = () => setStep(3)

  const handleEditar = (idx: number) => {
    setEditIdx(idx)
    setStep(2)
  }

  const uploadFile = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const r = await productService.uploadImage(fd)
    return urlDesdeUpload(r.data)
  }

  const handleGuardar = async () => {
    setSaving(true)
    setProgress({ done: 0, total: drafts.length })
    const errors: string[] = []

    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i]!
      try {
        // 1. Subir imagen principal
        const mainUrl = await uploadFile(d.mainFile)

        // 2. Subir imágenes adicionales
        const extraUrls: string[] = []
        for (const f of d.extraFiles) {
          const url = await uploadFile(f)
          if (url) extraUrls.push(url)
        }

        // 3. Crear producto
        const payload = {
          nombreProducto: d.nombre.trim(),
          precioVenta: Number(d.precioVenta) || 0,
          precioCompra: Number(d.precioCompra) || 0,
          stockActual: Number(d.stock) || 1,
          categoriaId: d.categoriaId ? Number(d.categoriaId) : null,
          imagenPrincipalUrl: mainUrl || null,
          condicion: 'NUEVO',
          visibleCatalogo: true,
        }
        const res = await productService.create(payload)
        const productId = idDesdeProductoCreado(res.data)

        // 4. Sincronizar galería si hay extras
        if (productId && extraUrls.length > 0) {
          const allUrls = [mainUrl, ...extraUrls].filter(Boolean)
          await productService.sincronizarImagenes(productId, allUrls).catch((err: unknown) => {
            console.error('[AdminCargaMasiva] sincronizarImagenes', err)
            toast({ message: 'No se pudieron sincronizar las imágenes', type: 'error' })
          })
        }
      } catch (err: unknown) {
        errors.push(`Producto "${d.nombre}" (${i + 1}): ${mensajeErrorCarga(err)}`)
      }
      setProgress(p => ({ ...p, done: p.done + 1 }))
    }

    setSaving(false)

    if (errors.length === 0) {
      toast({ message: `${drafts.length} producto${drafts.length === 1 ? '' : 's'} guardado${drafts.length === 1 ? '' : 's'} correctamente`, type: 'success' })
      navigate('/admin/productos')
    } else if (errors.length < drafts.length) {
      toast({ message: `${drafts.length - errors.length} guardados, ${errors.length} con error`, type: 'warning' })
      console.error('Errores en carga masiva:', errors)
    } else {
      toast({ message: 'No se pudo guardar ningún producto. Revisá la consola.', type: 'error' })
      console.error('Errores en carga masiva:', errors)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-5 md:p-6">
      <div className="mb-6 flex items-start gap-3">
        <button type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex min-h-8 min-w-8 items-center text-xl"
          aria-label="Volver"
        >
          <IconArrow className="h-4 w-4 text-hc-text" left />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-hc-text">Carga Masiva de Productos</h1>
          <p className="text-xs text-hc-muted">
            Subí hasta {limit} productos de una vez
          </p>
        </div>
      </div>

      <StepBar step={step} />

      {step === 1 && (
        <StepSubida onContinuar={handleContinuar} limit={limit} />
      )}

      {step === 2 && (
        <StepWizard
          key={`wizard-${editIdx}`}
          drafts={drafts}
          onUpdate={updateDraft}
          onFinalizar={handleFinalizar}
          categories={categories}
          initialIdx={editIdx}
        />
      )}

      {step === 3 && (
        <StepResumen
          drafts={drafts}
          categories={categories}
          onEditar={handleEditar}
          onGuardar={handleGuardar}
          saving={saving}
          progress={progress}
        />
      )}
    </div>
  )
}
