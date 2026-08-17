import { useImportExportBar } from './importExport/useImportExportBar'
import { ImportPreviewModal } from './importExport/ImportPreviewModal'

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
  const bar = useImportExportBar({
    data,
    columns,
    filename,
    sheetName,
    onImport,
    importColumns,
    mapImportRow,
  })

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {label && <span className="text-xs mr-1" style={{ color: 'var(--hc-muted)' }}>{label}</span>}

        {!exportOnly && (
          <>
            <button
              onClick={() => bar.fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--hc-surface-2)] hover:bg-[var(--hc-surface-3)] text-xs font-medium transition-colors"
              style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              title="Importar CSV o Excel"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {bar.t('importExport.import')}
            </button>
            <button
              onClick={bar.handleTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--hc-surface-2)] hover:bg-[var(--hc-surface-3)] text-xs font-medium transition-colors"
              style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}
              title="Descargar plantilla Excel"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {bar.t('importExport.template')}
            </button>
            <input
              ref={bar.fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={bar.handleFileChange}
            />
          </>
        )}

        <div className="w-px h-4 mx-0.5" style={{ backgroundColor: 'var(--hc-border)' }} />

        <button
          onClick={bar.handleExportCSV}
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
          onClick={bar.handleExportExcel}
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

      {bar.importErr && !bar.modal && (
        <p className="text-xs text-red-400 mt-1">{bar.importErr}</p>
      )}

      {bar.modal && (
        <ImportPreviewModal
          t={bar.t}
          preview={bar.preview}
          visibleCols={bar.visibleCols}
          importErr={bar.importErr}
          importOk={bar.importOk}
          confirmLabel={bar.importOk ? bar.t('importExport.ready') : bar.t('importExport.confirmImport', { count: bar.preview.length })}
          importing={bar.importing}
          onImport={bar.onImport}
          onClose={bar.closeModal}
          onConfirm={bar.handleConfirmImport}
        />
      )}
    </>
  )
}
