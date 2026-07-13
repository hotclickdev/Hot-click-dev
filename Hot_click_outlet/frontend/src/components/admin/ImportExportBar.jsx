import { useRef, useState } from 'react'
import { parseFile, exportCSV, exportExcel, downloadTemplate } from '@/utils/importExport'
import { useTranslation } from 'react-i18next'

/**
 * Barra de import/export reutilizable para páginas admin.
 *
 * Props:
 *   data          {Object[]}  - Datos actuales para exportar
 *   columns       {string[]}  - Columnas a exportar (y orden)
 *   filename      {string}    - Nombre base del archivo (sin extensión)
 *   sheetName?    {string}    - Nombre de la hoja Excel (default: 'Datos')
 *   onImport?     {(rows) => Promise<void>} - Callback con las filas parseadas
 *   importColumns?{string[]}  - Columnas requeridas para la plantilla de import
 *   mapImportRow? {(row) => Object} - Normaliza filas del archivo a la forma esperada por onImport
 *   exportOnly?   {boolean}   - Si true, oculta el botón de import
 *   label?        {string}    - Etiqueta que se muestra junto a los botones
 */
export default function ImportExportBar({
  data = [],
  columns,
  filename = 'exportacion',
  sheetName = 'Datos',
  onImport,
  importColumns,
  mapImportRow,
  exportOnly = false,
  label,
}) {
  const { t } = useTranslation()
  const fileRef     = useRef(null)
  const [modal, setModal]       = useState(false)  // preview modal
  const [preview, setPreview]   = useState([])
  const [importing, setImporting] = useState(false)
  const [importErr, setImportErr] = useState('')
  const [importOk, setImportOk]   = useState(false)

  // ── EXPORT ─────────────────────────────────────────────────────────────────
  const handleExportCSV   = () => exportCSV(data, filename, columns)
  const handleExportExcel = () => exportExcel(data, filename, columns, sheetName)
  const handleTemplate    = () => downloadTemplate(importColumns ?? columns ?? [], filename)

  // ── IMPORT ─────────────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
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
    } catch (err) {
      setImportErr(err?.message ?? t('importExport.importError'))
    } finally {
      setImporting(false)
    }
  }

  // Cuando se muestra preview de import, usar las columnas reales del archivo, no las del export
  const visibleCols = preview.length > 0 ? Object.keys(preview[0]) : (columns ?? [])

  const importStatusMsg = importOk
    ? <p className="text-xs flex-1" style={{ color: 'var(--hc-success)' }}>{t('importExport.success')}</p>
    : <p className="text-xs flex-1" style={{ color: 'var(--hc-muted)' }}>{t('importExport.previewNote')}</p>
  const confirmLabel = importOk
    ? t('importExport.ready')
    : t('importExport.confirmImport', { count: preview.length })

  return (
    <>
      {/* ─── Botones ─────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {label && <span className="text-xs mr-1" style={{ color: 'var(--hc-muted)' }}>{label}</span>}

        {!exportOnly && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--hc-surface-2)] hover:bg-[var(--hc-surface-3)] text-xs font-medium transition-colors"
              style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              title="Importar CSV o Excel"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t('importExport.import')}
            </button>
            <button
              onClick={handleTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--hc-surface-2)] hover:bg-[var(--hc-surface-3)] text-xs font-medium transition-colors"
              style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}
              title="Descargar plantilla Excel"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('importExport.template')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}

        <div className="w-px h-4 mx-0.5" style={{ backgroundColor: 'var(--hc-border)' }} />

        <button
          onClick={handleExportCSV}
          disabled={!data.length}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--hc-surface-2)] hover:bg-[var(--hc-surface-3)] text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          title="Exportar como CSV"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSV
        </button>
        <button
          onClick={handleExportExcel}
          disabled={!data.length}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a7a4a]/20 hover:bg-[#1a7a4a]/30 border border-[#1a7a4a]/40 text-[#4ade80] text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Exportar como Excel"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Excel
        </button>
      </div>

      {/* Error inline fuera del modal */}
      {importErr && !modal && (
        <p className="text-xs text-red-400 mt-1">{importErr}</p>
      )}

      {/* ─── Modal de preview ────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl"
            style={{ backgroundColor: 'var(--hc-surface-raised)', border: '1px solid var(--hc-border)' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--hc-border)' }}>
              <div>
                <h2 className="font-semibold text-base" style={{ color: 'var(--hc-text)' }}>{t('importExport.previewTitle')}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{t('importExport.rows', { count: preview.length })}</p>
              </div>
              <button
                onClick={() => { setModal(false); setImportErr('') }}
                className="hover:opacity-70 transition-opacity p-1"
                style={{ color: 'var(--hc-muted)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabla preview */}
            <div className="overflow-auto flex-1 p-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {visibleCols.map((c) => (
                      <th key={c} className="text-left px-3 py-2 font-medium whitespace-nowrap"
                        style={{ color: 'var(--hc-muted)', backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((row, i) => (
                    <tr key={i} style={i % 2 === 0 ? undefined : { backgroundColor: 'var(--hc-surface-2)' }}>
                      {visibleCols.map((c) => (
                        <td key={c} className="px-3 py-1.5 max-w-[200px] truncate"
                          style={{ color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
                          {String(row[c] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 50 && (
                <p className="text-xs mt-3 text-center" style={{ color: 'var(--hc-muted)' }}>
                  {t('importExport.preview50', { total: preview.length })}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--hc-border)' }}>
              {importErr ? (
                <p className="text-xs flex-1" style={{ color: 'var(--hc-danger)' }}>{importErr}</p>
              ) : importStatusMsg}
              <div className="flex gap-2">
                <button
                  onClick={() => { setModal(false); setImportErr('') }}
                  className="px-4 py-2 rounded-lg bg-[var(--hc-surface-2)] hover:bg-[var(--hc-surface-3)] text-sm transition-colors"
                  style={{ color: 'var(--hc-text)' }}
                >
                  {t('importExport.cancel')}
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importing || importOk || !onImport}
                  className="px-4 py-2 rounded-lg bg-[var(--hc-accent)] hover:bg-[var(--hc-accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {importing ? t('importExport.importing') : confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
