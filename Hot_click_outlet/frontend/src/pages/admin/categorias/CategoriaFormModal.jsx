import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import {
  ICONOS_CATEGORIA,
  etiquetaBotonGuardarCategoria,
  etiquetaOpcionPadre,
} from './formCategoria'

function estiloBotonIcono(seleccionado) {
  if (seleccionado) {
    return { background: 'rgba(23,71,168,0.2)', borderColor: 'var(--hc-accent)', color: 'var(--hc-accent)' }
  }
  return { background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#8e8e9a' }
}

function IconoCategoriaPicker({ icono, onCambiar }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#e8e8ed]">Icono (opcional)</label>
      <div className="grid grid-cols-10 gap-1">
        <button
          type="button"
          onClick={() => onCambiar('')}
          title="Sin icono"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all border"
          style={estiloBotonIcono(!icono)}
        >—</button>
        {ICONOS_CATEGORIA.map(({ emoji, label }) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onCambiar(emoji)}
            title={label}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all border"
            style={icono === emoji
              ? { background: 'rgba(23,71,168,0.2)', borderColor: 'var(--hc-accent)' }
              : { background: 'transparent', borderColor: 'transparent' }
            }
          >{emoji}</button>
        ))}
      </div>
      {icono && (
        <p className="text-xs text-[#8e8e9a]">Icono seleccionado: {icono}</p>
      )}
    </div>
  )
}

function SelectPadre({ padreId, opciones, categorias, onChange }) {
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
}) {
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
