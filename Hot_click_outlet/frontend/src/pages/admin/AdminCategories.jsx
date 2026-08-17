import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { categoriaService } from '@/services/orderService'
import ImportExportBar from '@/components/admin/ImportExportBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import CategoriaCard from './categorias/CategoriaCard'
import CategoriaFormModal from './categorias/CategoriaFormModal'
import CategoriasEmptyState from './categorias/CategoriasEmptyState'
import {
  COLUMNAS_EXPORT_CATEGORIAS,
  COLUMNAS_IMPORT_CATEGORIAS,
  FORMULARIO_CATEGORIA_VACIO,
  NOMBRE_ARCHIVO_CATEGORIAS,
  NOMBRE_HOJA_CATEGORIAS,
  armarArbolCategorias,
  etiquetaConteoCategorias,
  filaImportacionCategoria,
  filasExportacionCategorias,
  formularioDesdeCategoria,
  formularioNuevaCategoria,
  listaCategoriasDesdeRespuesta,
  mensajeErrorCategoria,
  opcionesPadre,
} from './categorias/formCategoria'

async function obtenerListaCategorias() {
  const { data } = await categoriaService.getAll()
  return listaCategoriasDesdeRespuesta(data)
}

export default function AdminCategories() {
  const { t } = useTranslation()
  const toast = useToast()
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(FORMULARIO_CATEGORIA_VACIO)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const arbol = useMemo(() => armarArbolCategorias(categorias), [categorias])
  const opcionesDePadre = useMemo(
    () => opcionesPadre(categorias, editing),
    [categorias, editing],
  )

  // Carga inicial una sola vez (toast/t no deben re-disparar el fetch).
  useEffect(() => {
    let cancelado = false
    obtenerListaCategorias()
      .then((lista) => { if (!cancelado) setCategorias(lista) })
      .catch(() => { if (!cancelado) toast({ message: t('common.error'), type: 'error' }) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  function recargarCategorias() {
    setLoading(true)
    obtenerListaCategorias()
      .then(setCategorias)
      .catch(() => toast({ message: t('common.error'), type: 'error' }))
      .finally(() => setLoading(false))
  }

  function abrirNueva(padreId = '') {
    setEditing(null)
    setForm(formularioNuevaCategoria(padreId))
    setModalOpen(true)
  }

  function abrirEdicion(categoria) {
    setEditing(categoria)
    setForm(formularioDesdeCategoria(categoria))
    setModalOpen(true)
  }

  function actualizarCampo(campo) {
    return (evento) => setForm((prev) => ({ ...prev, [campo]: evento.target.value }))
  }

  async function guardarCategoria(evento) {
    evento.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await categoriaService.update(editing.id, form)
        toast({ message: 'Categoría actualizada', type: 'success' })
      } else {
        await categoriaService.create(form)
        toast({ message: 'Categoría creada', type: 'success' })
      }
      setModalOpen(false)
      recargarCategorias()
    } catch (error) {
      toast({ message: mensajeErrorCategoria(error, 'Error al guardar'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function confirmarBorrado() {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)
    try {
      await categoriaService.delete(id)
      toast({ message: 'Categoría eliminada', type: 'success' })
      recargarCategorias()
    } catch {
      toast({ message: 'Error al eliminar', type: 'error' })
    }
  }

  async function importarCategorias(filas) {
    await categoriaService.importBulk(filas)
    recargarCategorias()
  }

  return (
    <>
      <div className="space-y-6">
        <CategoriasHeader
          categorias={categorias}
          onImportar={importarCategorias}
          onNueva={() => abrirNueva()}
        />
        <CategoriasContenido
          loading={loading}
          arbol={arbol}
          categorias={categorias}
          onNueva={() => abrirNueva()}
          onEdit={abrirEdicion}
          onDelete={(nodo) => setDeleteTarget({ id: nodo.id, nombre: nodo.nombreCategoria })}
          onAddSub={(padre) => abrirNueva(padre.id)}
        />
      </div>

      <CategoriaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        form={form}
        categorias={categorias}
        opcionesPadreList={opcionesDePadre}
        saving={saving}
        onCampoChange={actualizarCampo}
        onIconoChange={(icono) => setForm((prev) => ({ ...prev, icono }))}
        onSubmit={guardarCategoria}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmarBorrado}
        title="Eliminar categoría"
        message={`¿Eliminar "${deleteTarget?.nombre}"? Las subcategorías y productos con esta categoría quedarán sin padre.`}
      />
    </>
  )
}

function CategoriasHeader({ categorias, onImportar, onNueva }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.categories.title')}</h1>
        <p className="text-sm text-[#8e8e9a] mt-1">{etiquetaConteoCategorias(categorias)}</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <ImportExportBar
          data={filasExportacionCategorias(categorias)}
          columns={COLUMNAS_EXPORT_CATEGORIAS}
          filename={NOMBRE_ARCHIVO_CATEGORIAS}
          sheetName={NOMBRE_HOJA_CATEGORIAS}
          importColumns={COLUMNAS_IMPORT_CATEGORIAS}
          mapImportRow={filaImportacionCategoria}
          onImport={onImportar}
        />
        <Button onClick={onNueva}>+ Nuevo grupo</Button>
      </div>
    </div>
  )
}

function CategoriasContenido({ loading, arbol, categorias, onNueva, onEdit, onDelete, onAddSub }) {
  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  }
  if (categorias.length === 0) {
    return <CategoriasEmptyState onCrear={onNueva} />
  }
  return (
    <div className="space-y-3">
      {arbol.map((nodo) => (
        <CategoriaCard
          key={nodo.id}
          node={nodo}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSub={onAddSub}
        />
      ))}
    </div>
  )
}
