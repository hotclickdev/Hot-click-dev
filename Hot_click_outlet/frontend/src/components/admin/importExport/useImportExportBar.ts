import { useRef, useState, type ChangeEvent } from 'react'
import { parseFile, exportCSV, exportExcel, downloadTemplate } from '@/utils/importExport'
import { useTranslation } from 'react-i18next'

export type FilaImport = Record<string, unknown>

export type ImportExportBarConfig = {
  data?: FilaImport[]
  columns?: string[]
  filename?: string
  sheetName?: string
  onImport?: (rows: FilaImport[]) => void | Promise<void>
  importColumns?: string[]
  mapImportRow?: (row: FilaImport) => FilaImport
}

function mensajeErrorImport(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message: unknown }).message
    return typeof message === 'string' ? message : undefined
  }
  return undefined
}

/** Handlers de import/export — bit-idéntico al original. */
export function useImportExportBar({
  data = [],
  columns,
  filename = 'exportacion',
  sheetName = 'Datos',
  onImport,
  importColumns,
  mapImportRow,
}: ImportExportBarConfig) {
  const { t } = useTranslation()
  const fileRef     = useRef<HTMLInputElement>(null)
  const [modal, setModal]       = useState(false)
  const [preview, setPreview]   = useState<FilaImport[]>([])
  const [importing, setImporting] = useState(false)
  const [importErr, setImportErr] = useState('')
  const [importOk, setImportOk]   = useState(false)

  const handleExportCSV   = () => exportCSV(data, filename, columns)
  const handleExportExcel = () => exportExcel(data, filename, columns, sheetName)
  const handleTemplate    = () => downloadTemplate(importColumns ?? columns ?? [], filename)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportErr('')
    setImportOk(false)
    try {
      const rows = await parseFile(file)
      if (!rows.length) { setImportErr(t('importExport.emptyFile')); return }
      const mapped = mapImportRow ? rows.map(mapImportRow) : rows
      setPreview(mapped)
      setModal(true)
    } catch {
      setImportErr(t('importExport.readError'))
    }
  }

  const handleConfirmImport = async () => {
    if (!onImport) return
    setImporting(true)
    setImportErr('')
    try {
      await onImport(preview)
      setImportOk(true)
      setTimeout(() => { setModal(false); setImportOk(false) }, 1200)
    } catch (err: unknown) {
      setImportErr(mensajeErrorImport(err) ?? t('importExport.importError'))
    } finally {
      setImporting(false)
    }
  }

  const visibleCols = preview.length > 0 ? Object.keys(preview[0]) : (columns ?? [])

  const closeModal = () => { setModal(false); setImportErr('') }

  return {
    t,
    fileRef,
    modal,
    preview,
    importing,
    importErr,
    importOk,
    visibleCols,
    handleExportCSV,
    handleExportExcel,
    handleTemplate,
    handleFileChange,
    handleConfirmImport,
    closeModal,
    onImport,
  }
}
