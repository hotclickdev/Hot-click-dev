import AdminLayout from '@/layouts/AdminLayout'
import EncargosPanel from '@/features/encargos/EncargosPanel'

export default function AdminEncargos() {
  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-5xl">
        <EncargosPanel />
      </div>
    </AdminLayout>
  )
}
