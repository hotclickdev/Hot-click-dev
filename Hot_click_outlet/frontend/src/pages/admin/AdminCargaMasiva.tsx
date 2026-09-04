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
  mensajeErrorCarga,
  type CargaProgress,
  type CategoriaCarga,
  type ProductoDraft,
} from './carga-masiva/cargaMasivaHelpers'
import { IconArrow } from './carga-masiva/cargaMasivaIcons'
import StepSubida from './carga-masiva/StepSubida'
import StepWizard from './carga-masiva/StepWizard'
import StepResumen from './carga-masiva/StepResumen'
import StepBar from './carga-masiva/StepBar'
import { useCargaMasivaEmpresa } from './carga-masiva/useCargaMasivaEmpresa'
import { publicarDraftCarga } from './carga-masiva/publicarDraftCarga'
import EmpresaDestinoSelect from './empresas/EmpresaDestinoSelect'

export default function AdminCargaMasiva() {
  const navigate = useNavigate()
  const toast = useToast()
  const destino = useCargaMasivaEmpresa()
  const userRole = useAuthStore((s) => s.userRole)
  const limit = EXTENDED_ROLES.has(userRole ?? '') ? LIMIT_EXTENDED : LIMIT_DEFAULT

  const [step, setStep] = useState(1)
  const [drafts, setDrafts] = useState<ProductoDraft[]>([])
  const [editIdx, setEditIdx] = useState(0)
  const [categories, setCategories] = useState<CategoriaCarga[]>([])
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<CargaProgress>({ done: 0, total: 0 })

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
    if (!destino.exigirDestino()) return
    setDrafts(newDrafts)
    setStep(2)
  }

  const handleGuardar = async () => {
    if (!destino.exigirDestino()) return
    setSaving(true)
    setProgress({ done: 0, total: drafts.length })
    const errors: string[] = []

    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i]!
      try {
        await publicarDraftCarga(d, destino.empresaParam, (err) => {
          console.error('[AdminCargaMasiva] sincronizarImagenes', err)
          toast({ message: 'No se pudieron sincronizar las imágenes', type: 'error' })
        })
      } catch (err: unknown) {
        errors.push(`Producto "${d.nombre}" (${i + 1}): ${mensajeErrorCarga(err)}`)
      }
      setProgress(p => ({ ...p, done: p.done + 1 }))
    }

    setSaving(false)
    informarResultadoCarga(errors, drafts.length, toast, () => navigate(destino.rutaTrasGuardar))
  }

  return (
    <div className="mx-auto max-w-3xl p-5 md:p-6">
      <div className="mb-6 flex items-start gap-3">
        <button type="button"
          onClick={() => navigate(destino.rutaVolver)}
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

      {destino.esAdminIT && (
        <div className="mb-5">
          <EmpresaDestinoSelect
            empresas={destino.empresas}
            value={destino.empresaId}
            onChange={destino.setEmpresaId}
          />
        </div>
      )}

      <StepBar step={step} />

      {step === 1 && (
        <StepSubida onContinuar={handleContinuar} limit={limit} importarCsvTo={destino.rutaCsv} />
      )}

      {step === 2 && (
        <StepWizard
          key={`wizard-${editIdx}`}
          drafts={drafts}
          onUpdate={updateDraft}
          onFinalizar={() => setStep(3)}
          categories={categories}
          initialIdx={editIdx}
        />
      )}

      {step === 3 && (
        <StepResumen
          drafts={drafts}
          categories={categories}
          onEditar={(idx) => { setEditIdx(idx); setStep(2) }}
          onGuardar={handleGuardar}
          saving={saving}
          progress={progress}
        />
      )}
    </div>
  )
}

function informarResultadoCarga(
  errors: string[],
  total: number,
  toast: (opts: { message: string; type: 'success' | 'warning' | 'error' }) => void,
  onExito: () => void,
) {
  if (errors.length === 0) {
    toast({
      message: `${total} producto${total === 1 ? '' : 's'} guardado${total === 1 ? '' : 's'} correctamente`,
      type: 'success',
    })
    onExito()
    return
  }
  if (errors.length < total) {
    toast({ message: `${total - errors.length} guardados, ${errors.length} con error`, type: 'warning' })
  } else {
    toast({ message: 'No se pudo guardar ningún producto. Revisá la consola.', type: 'error' })
  }
  console.error('Errores en carga masiva:', errors)
}
