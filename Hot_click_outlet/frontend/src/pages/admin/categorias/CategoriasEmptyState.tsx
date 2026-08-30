import TextoMas from '@/components/ui/TextoMas'
import { AdminPrimaryButton } from '@/prototipo/admin/AdminUi'

export default function CategoriasEmptyState({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="space-y-3 py-14 text-center">
      <p className="font-semibold text-hc-text">Sin categorías todavía</p>
      <p className="mx-auto max-w-xs text-sm text-hc-muted">
        Las categorías organizan tu catálogo. Los productos las necesitan para publicarse.
      </p>
      <AdminPrimaryButton onClick={onCrear}>
        <TextoMas>Agregar categoría</TextoMas>
      </AdminPrimaryButton>
    </div>
  )
}
