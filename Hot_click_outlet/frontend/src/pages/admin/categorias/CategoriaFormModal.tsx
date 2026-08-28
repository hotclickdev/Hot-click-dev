import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import CatIcon from '@/pages/catalogo/CatIcon'
import {
  ICONOS_CATEGORIA,
  etiquetaBotonGuardarCategoria,
  etiquetaIconoCategoria,
  etiquetaOpcionPadre,
  iconoCategoriaEsItem,
  type CategoriaAdmin,
  type FormularioCategoria,
} from './formCategoria'
import type { ChangeEvent, CSSProperties, FormEvent } from 'react'

function estiloBotonIcono(seleccionado: boolean): CSSProperties {
  if (seleccionado) {
    return { background: 'rgba(23,71,168,0.2)', borderColor: 'var(--hc-accent)', color: 'var(--hc-accent)' }
  }
  return { background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#8e8e9a' }
}

type IconoItem = (typeof ICONOS_CATEGORIA)[number]

function BotonIconoCategoria({ item, seleccionado, onCambiar }: {
  item: IconoItem
  seleccionado: boolean
  onCambiar: (clave: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onCambiar(item.clave)}
      title={item.label}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all border"
      style={estiloBotonIcono(seleccionado)}
    >
      <CatIcon name={item.clave} className="w-4 h-4" />
    </button>
  )
}

function IconoCategoriaPicker({ icono, onCambiar }: { icono: string; onCambiar: (clave: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-[#e8e8ed]">Icono (opcional)</p>
      <div className="grid grid-cols-10 gap-1">
        <button
          type="button"
          onClick={() => onCambiar('')}
          title="Sin icono"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all border"
          style={estiloBotonIcono(!icono)}
        >—</button>
        {ICONOS_CATEGORIA.map((item) => (
          <BotonIconoCategoria
            key={item.clave}
            item={item}
            seleccionado={iconoCategoriaEsItem(icono, item)}
            onCambiar={onCambiar}
          />
        ))}
      </div>
      {icono && (
        <p className="text-xs text-[#8e8e9a]">
          Icono seleccionado: {etiquetaIconoCategoria(icono)}
        </p>
      )}
    </div>
  )
}

function SelectPadre({ padreId, opciones, categorias, onChange }: {
  padreId: string
  opciones: CategoriaAdmin[]
  categorias: CategoriaAdmin[]
  onChange: (evento: ChangeEvent<HTMLSelectElement>) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="cat-padre" className="text-sm font-medium text-[#e8e8ed]">Grupo al que pertenece (opcional)</label>
      <select
        id="cat-padre"
        value={padreId}
        onChange={onChange}
        className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
      >
        <option value="">Ninguno — categoría principal</option>
        {opciones.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {etiquetaOpcionPadre(categoria, categorias)}
          </option>
        ))}
      </select>
      <p className="text-xs text-[#8e8e9a]">
        Si elegís un grupo, esta pasa a ser subcategoría dentro de él.
      </p>
    </div>
  )
}

export type CategoriaFormModalProps = {
  open: boolean
  onClose: () => void
  editing: CategoriaAdmin | null
  form: FormularioCategoria
  categorias: CategoriaAdmin[]
  opcionesPadreList: CategoriaAdmin[]
  saving: boolean
  onCampoChange: (campo: keyof FormularioCategoria) => (evento: { target: { value: string } }) => void
  onIconoChange: (icono: string) => void
  onSubmit: (evento: FormEvent) => void
}

export default function CategoriaFormModal({
  open,
  onClose,
  editing,
  form,
  categorias,
  opcionesPadreList,
  saving,
  onCampoChange,
  onIconoChange,
  onSubmit,
}: CategoriaFormModalProps) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('admin.categories.edit') : t('admin.categories.new')}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Nombre *"
          value={form.nombreCategoria}
          onChange={onCampoChange('nombreCategoria')}
          required
        />
        <Input
          label="Descripción"
          value={form.descripcion}
          onChange={onCampoChange('descripcion')}
        />
        <IconoCategoriaPicker icono={form.icono} onCambiar={onIconoChange} />
        <SelectPadre
          padreId={form.padreId}
          opciones={opcionesPadreList}
          categorias={categorias}
          onChange={onCampoChange('padreId')}
        />
        <div className="flex gap-3 pt-1">
          <Button type="submit" loading={saving} className="flex-1">
            {etiquetaBotonGuardarCategoria(Boolean(editing), form.padreId)}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
