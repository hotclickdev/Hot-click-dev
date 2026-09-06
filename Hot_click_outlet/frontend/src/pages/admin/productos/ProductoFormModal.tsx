import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import MultiImagePicker from '@/components/ui/MultiImagePicker'
import { setCampo, setField } from './productoFormCampos'
import AlertaSinCategorias from './AlertaSinCategorias'
import BloquePrecios from './BloquePrecios'
import BloqueInventario from './BloqueInventario'
import BloqueCategoriaBodega from './BloqueCategoriaBodega'
import BloqueContenido from './BloqueContenido'
import BloqueSeo from './BloqueSeo'
import type {
  AdminProductoForm,
  BodegaAdmin,
  CategoriaAdmin,
  MarcaAdmin,
  ProductoAdmin,
} from './productosHelpers'
import type { Dispatch, FormEvent, SetStateAction } from 'react'

export type ProductoFormModalProps = {
  open: boolean
  onClose: () => void
  form: AdminProductoForm
  setForm: Dispatch<SetStateAction<AdminProductoForm>>
  categories: CategoriaAdmin[]
  bodegas: BodegaAdmin[]
  marcas: MarcaAdmin[]
  editing: ProductoAdmin | null
  saving: boolean
  seoOpen: boolean
  setSeoOpen: Dispatch<SetStateAction<boolean>>
  seoAutoTitle: boolean
  setSeoAutoTitle: Dispatch<SetStateAction<boolean>>
  seoAutoDesc: boolean
  setSeoAutoDesc: Dispatch<SetStateAction<boolean>>
  onSubmit: (e: FormEvent) => void
  setModalOpen: Dispatch<SetStateAction<boolean>>
}

export default function ProductoFormModal({
  open,
  onClose,
  form,
  setForm,
  categories,
  bodegas,
  marcas,
  editing,
  saving,
  seoOpen,
  setSeoOpen,
  seoAutoTitle,
  setSeoAutoTitle,
  seoAutoDesc,
  setSeoAutoDesc,
  onSubmit,
  setModalOpen,
}: ProductoFormModalProps) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose} title={editing ? t('admin.products.edit') : t('admin.products.new')} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Nombre *" value={form.nombre} onChange={setCampo(setForm, 'nombre')} required />
        <Input label="Título visible en tienda" value={form.titulo} onChange={setCampo(setForm, 'titulo')} hint="Si está vacío se usa el nombre. Este título lo ven los clientes." />
        <Input label="Descripción corta" value={form.descripcion} onChange={setCampo(setForm, 'descripcion')} />

        <BloquePrecios form={form} setForm={setForm} />
        <BloqueInventario form={form} setForm={setForm} />

        {categories.length === 0 && (
          <AlertaSinCategorias onCerrar={() => setModalOpen(false)} />
        )}

        <BloqueCategoriaBodega form={form} setForm={setForm} categories={categories} bodegas={bodegas} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Marca</label>
          <select value={form.marcaId} onChange={setCampo(setForm, 'marcaId')} className="h-11 px-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
            <option value="">— Sin marca —</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>{m.nombreMarca}</option>
            ))}
          </select>
        </div>

        <MultiImagePicker
          imagenes={form.imagenes}
          onChange={(imgs) => setForm((prev) => ({ ...prev, imagenes: imgs, imagenUrl: imgs[0] ?? prev.imagenUrl }))}
        />

        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Destacado</p>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Aparece primero en el inicio de la tienda</p>
          </div>
          <button
            type="button"
            onClick={() => setField(setForm, 'destacado', !form.destacado)}
            className="relative w-11 h-6 rounded-full transition-colors duration-200"
            style={{ backgroundColor: form.destacado ? '#f59e0b' : 'var(--hc-border)' }}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white hc-papel-blanco shadow transition-transform duration-200 ${form.destacado ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <BloqueContenido form={form} setForm={setForm} />
        <BloqueSeo
          form={form}
          setForm={setForm}
          seoOpen={seoOpen}
          setSeoOpen={setSeoOpen}
          seoAutoTitle={seoAutoTitle}
          setSeoAutoTitle={setSeoAutoTitle}
          seoAutoDesc={seoAutoDesc}
          setSeoAutoDesc={setSeoAutoDesc}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving} className="flex-1">{editing ? t('admin.products.saved') : t('admin.products.new')}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </form>
    </Modal>
  )
}
