import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { productService } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import { LIMIT_DEFAULT, LIMIT_EXTENDED, EXTENDED_ROLES } from './carga-masiva/cargaMasivaHelpers'
import { IconArrow } from './carga-masiva/cargaMasivaIcons'
import StepSubida from './carga-masiva/StepSubida'
import StepWizard from './carga-masiva/StepWizard'
import StepResumen from './carga-masiva/StepResumen'
import StepBar from './carga-masiva/StepBar'

export default function AdminCargaMasiva() {
  const navigate = useNavigate()
  const toast = useToast()
  const userRole = useAuthStore((s) => s.userRole)
  const limit = EXTENDED_ROLES.has(userRole) ? LIMIT_EXTENDED : LIMIT_DEFAULT

  const [step, setStep] = useState(1)
  const [drafts, setDrafts] = useState([])
  const [editIdx, setEditIdx] = useState(0)
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  // Ref para poder revocar todos los object URLs al desmontar
  const draftsRef = useRef([])
  useEffect(() => { draftsRef.current = drafts }, [drafts])

  useEffect(() => {
    productService.getCategories()
      .then(r => setCategories(r.data?.data ?? r.data ?? []))
      .catch(() => toast({ message: 'Error al cargar categorías', type: 'error' }))
    return () => {
      draftsRef.current.forEach(d => {
        URL.revokeObjectURL(d.mainPreview)
        d.extraPreviews.forEach(u => URL.revokeObjectURL(u))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  const updateDraft = (idx, fields) => {
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, ...fields } : d))
  }

  const handleContinuar = (newDrafts) => {
    setDrafts(newDrafts)
    setStep(2)
  }

  const handleFinalizar = () => setStep(3)

  const handleEditar = (idx) => {
    setEditIdx(idx)
    setStep(2)
  }

  const uploadFile = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const r = await productService.uploadImage(fd)
    return r.data?.data?.url ?? r.data?.url ?? ''
  }

  const handleGuardar = async () => {
    setSaving(true)
    setProgress({ done: 0, total: drafts.length })
    const errors = []

    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i]
      try {
        // 1. Subir imagen principal
        const mainUrl = await uploadFile(d.mainFile)

        // 2. Subir imágenes adicionales
        const extraUrls = []
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
        const productId = res.data?.data?.id ?? res.data?.id

        // 4. Sincronizar galería si hay extras
        if (productId && extraUrls.length > 0) {
          const allUrls = [mainUrl, ...extraUrls].filter(Boolean)
          await productService.sincronizarImagenes(productId, allUrls).catch(() => {})
        }
      } catch (err) {
        errors.push(`Producto "${d.nombre}" (${i + 1}): ${err?.response?.data?.message ?? err.message ?? 'Error'}`)
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/productos')}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/8"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <IconArrow className="w-4 h-4" style={{ color: 'var(--hc-muted)' }} left />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Carga masiva de productos</h1>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
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
