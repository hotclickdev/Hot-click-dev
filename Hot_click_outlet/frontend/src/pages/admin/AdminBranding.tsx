import { useState, useEffect, type FormEvent } from 'react'
import { brandingService } from '@/services/brandingService'
import { applyBranding, invalidateBrandingCache, type BrandingPublico } from '@/hooks/useBranding'
import BrandingForm from './branding/BrandingForm'
import BrandingPreview from './branding/BrandingPreview'
import { mensajeErrorBranding, type BrandingFormulario } from './branding/brandingHelpers'
import type { JsonBody } from '@/types/api'

export default function AdminBranding() {
  const [form, setForm] = useState<BrandingFormulario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    brandingService.get().then(({ data }) => setForm(data as BrandingFormulario))
      .catch((err: unknown) => {
        console.error('[AdminBranding] cargar', err)
        setError('No se pudo cargar la configuración')
      })
      .finally(() => setCargando(false))
  }, [])

  const set = (key: keyof BrandingFormulario) => (val: string) =>
    setForm(p => ({ ...(p ?? {}), [key]: val } as BrandingFormulario))

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setGuardando(true); setOk(false); setError(null)
    try {
      const { data } = await brandingService.update(form as JsonBody)
      setForm(data as BrandingFormulario)
      invalidateBrandingCache()
      applyBranding(data as BrandingPublico)
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } catch (err: unknown) {
      console.error('[AdminBranding] guardar', err)
      setError(mensajeErrorBranding(err, 'Error al guardar'))
    } finally { setGuardando(false) }
  }

  if (cargando) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
      </div>
    )
  }

  if (!form) return <div className="p-6 text-red-400">{error}</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Branding / White Label</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
          Personaliza los colores, tipografía e identidad visual de tu tienda
        </p>
      </div>

      <form onSubmit={guardar} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BrandingForm form={form} set={set} error={error} guardando={guardando} ok={ok} />
        <BrandingPreview form={form} />
      </form>
    </div>
  )
}
