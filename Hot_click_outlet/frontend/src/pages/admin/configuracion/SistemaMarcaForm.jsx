import Spinner from '@/components/ui/Spinner'
import { RetryBanner } from '@/components/ui/RetryBanner'
import Section from '@/pages/admin/mi-empresa/Section'
import { F, SectionHeader } from './configUi'
import SistemaMarcaCampos from './SistemaMarcaCampos'
import { useSistemaMarcaForm } from './useSistemaMarcaForm'

/** Marca de la tienda pública: se guarda en el perfil de empresa. */
export default function SistemaMarcaForm() {
  const page = useSistemaMarcaForm()

  if (page.loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  }
  if (page.loadError) {
    return <RetryBanner message="No se pudo cargar la marca de tu tienda." onRetry={page.cargar} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader
        title="Cómo te ven en tu tienda"
        desc="Nombre, logo y WhatsApp se guardan en tu negocio. Los compradores los ven en /tienda."
      />
      <form onSubmit={page.guardar} className="space-y-4">
        <Section title="Identidad pública">
          <SistemaMarcaCampos
            form={page.form}
            setForm={page.setForm}
            errors={page.errors}
            uploading={page.uploading}
            onLogoFile={page.onLogoFile}
            onQuitarLogo={page.onQuitarLogo}
          />
        </Section>
        <button
          type="submit"
          disabled={page.saving}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 min-h-11"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff', fontFamily: F.body }}
        >
          {page.saving ? 'Guardando…' : 'Guardar marca'}
        </button>
      </form>
    </div>
  )
}
