import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { marcaService } from '@/services/marcaService'
import { useToast } from '@/components/ui/Toast'
import ImportExportBar from '@/components/admin/ImportExportBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import MarcaCard from './marcas/MarcaCard'
import MarcaFormModal from './marcas/MarcaFormModal'
import MarcasEmptyState from './marcas/MarcasEmptyState'
import {
  COLUMNAS_EXPORT_MARCAS,
  COLUMNAS_IMPORT_MARCAS,
  FORMULARIO_MARCA_VACIO,
  NOMBRE_ARCHIVO_MARCAS,
  NOMBRE_HOJA_MARCAS,
  etiquetaConteoMarcas,
  filaImportacionMarca,
  filasExportacionMarcas,
  formularioDesdeMarca,
  listaMarcasDesdeRespuesta,
  mensajeErrorMarca,
  nombreMarcaEsValido,
} from './marcas/formMarca'

async function obtenerListaMarcas() {
  const { data } = await marcaService.getAll()
  return listaMarcasDesdeRespuesta(data)
}

export default function AdminMarcas() {
  const { t } = useTranslation()
  const toast = useToast()
  const [marcas, setMarcas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(FORMULARIO_MARCA_VACIO)
  const [saving, setSaving] = useState(false)
  const [imgError, setImgError] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Carga inicial una sola vez (toast/t no deben re-disparar el fetch).
  useEffect(() => {
    let cancelado = false
    obtenerListaMarcas()
      .then((lista) => { if (!cancelado) setMarcas(lista) })
      .catch(() => { if (!cancelado) toast({ message: t('common.error'), type: 'error' }) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  function recargarMarcas() {
    setLoading(true)
    obtenerListaMarcas()
      .then(setMarcas)
      .catch(() => toast({ message: t('common.error'), type: 'error' }))
      .finally(() => setLoading(false))
  }

  function abrirNueva() {
    setEditing(null)
    setForm(FORMULARIO_MARCA_VACIO)
    setModalOpen(true)
  }

  function abrirEdicion(marca) {
    setEditing(marca)
    setForm(formularioDesdeMarca(marca))
    setModalOpen(true)
  }

  async function guardarMarca(evento) {
    evento.preventDefault()
    if (!nombreMarcaEsValido(form.nombreMarca)) {
      toast({ message: 'El nombre es requerido', type: 'error' })
      return
    }
    setSaving(true)
    try {
      if (editing) await marcaService.update(editing.id, form)
      else await marcaService.create(form)
      toast({ message: t('admin.marcas.saved'), type: 'success' })
      setModalOpen(false)
      recargarMarcas()
    } catch (error) {
      toast({ message: mensajeErrorMarca(error, t('common.error')), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function confirmarBorrado() {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)
    try {
      await marcaService.delete(id)
      toast({ message: t('admin.marcas.deleted'), type: 'success' })
      setMarcas((prev) => prev.filter((marca) => marca.id !== id))
    } catch {
      toast({ message: t('common.error'), type: 'error' })
    }
  }

  async function importarMarcas(filas) {
    await marcaService.importBulk(filas)
    recargarMarcas()
  }

  return (
    <>
      <div className="space-y-6">
        <MarcasHeader
          cantidad={marcas.length}
          marcas={marcas}
          onImportar={importarMarcas}
          onNueva={abrirNueva}
        />
        <MarcasContenido
          loading={loading}
          marcas={marcas}
          imgError={imgError}
          onNueva={abrirNueva}
          onEdit={abrirEdicion}
          onDelete={(marca) => setDeleteTarget({ id: marca.id, nombre: marca.nombreMarca })}
          onLogoError={(id) => setImgError((prev) => ({ ...prev, [id]: true }))}
        />
      </div>

      <MarcaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        form={form}
        onNombreChange={(evento) => setForm((prev) => ({ ...prev, nombreMarca: evento.target.value }))}
        onQuitarLogo={() => setForm((prev) => ({ ...prev, logoUrl: '' }))}
        onLogoSubido={(url) => setForm((prev) => ({ ...prev, logoUrl: url }))}
        saving={saving}
        onSubmit={guardarMarca}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmarBorrado}
        title="Eliminar marca"
        message={`¿Eliminar la marca "${deleteTarget?.nombre}"? Los productos que la usen quedarán sin marca asignada.`}
      />
    </>
  )
}

function MarcasHeader({ cantidad, marcas, onImportar, onNueva }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>{t('admin.marcas.title')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{etiquetaConteoMarcas(cantidad)}</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <ImportExportBar
          data={filasExportacionMarcas(marcas)}
          columns={COLUMNAS_EXPORT_MARCAS}
          filename={NOMBRE_ARCHIVO_MARCAS}
          sheetName={NOMBRE_HOJA_MARCAS}
          importColumns={COLUMNAS_IMPORT_MARCAS}
          mapImportRow={filaImportacionMarca}
          onImport={onImportar}
        />
        <Button onClick={onNueva}>+ {t('admin.marcas.new')}</Button>
      </div>
    </div>
  )
}

function MarcasContenido({ loading, marcas, imgError, onNueva, onEdit, onDelete, onLogoError }) {
  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  }
  if (marcas.length === 0) {
    return <MarcasEmptyState onCrear={onNueva} />
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {marcas.map((marca) => (
        <MarcaCard
          key={marca.id}
          marca={marca}
          logoRoto={Boolean(imgError[marca.id])}
          onEdit={onEdit}
          onDelete={onDelete}
          onLogoError={() => onLogoError(marca.id)}
        />
      ))}
    </div>
  )
}
