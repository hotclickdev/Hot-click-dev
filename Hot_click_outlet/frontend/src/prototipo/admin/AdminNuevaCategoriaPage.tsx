import { useNavigate } from 'react-router-dom'
import type { FormEvent } from 'react'
import { useState } from 'react'
import AdminPageHeader from './AdminPageHeader'
import { AdminChipRow, AdminField, AdminPrimaryButton, fieldClass } from './AdminUi'

const VISIBILIDAD = ['Todas las tiendas', 'Solo PYME+'] as const

/**
 * Admin · Nueva categoría (Figma 78:627).
 */
export default function AdminNuevaCategoriaPage() {
  const navigate = useNavigate()
  const [visiblePara, setVisiblePara] = useState<(typeof VISIBILIDAD)[number]>('Todas las tiendas')

  function crear(e: FormEvent) {
    e.preventDefault()
    navigate('/prototipo/admin/config/categorias')
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader titulo="Nueva Categoría" atras="/prototipo/admin/config/categorias" />
      <form onSubmit={crear}>
        <AdminField id="nombre-cat" label="Nombre de la categoría">
          <input
            id="nombre-cat"
            name="nombre"
            required
            placeholder="Ej: Hogar y Decoración"
            className={fieldClass}
          />
        </AdminField>
        <p className="mb-2 mt-6 text-xs font-medium text-hc-muted">Visible para</p>
        <AdminChipRow opciones={VISIBILIDAD} valor={visiblePara} onChange={setVisiblePara} />
        <div className="mt-6">
          <AdminPrimaryButton type="submit">Crear categoría</AdminPrimaryButton>
        </div>
      </form>
    </main>
  )
}
