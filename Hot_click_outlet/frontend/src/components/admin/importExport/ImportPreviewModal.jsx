export function ImportPreviewModal({
  t,
  preview,
  visibleCols,
  importErr,
  importOk,
  confirmLabel,
  importing,
  onImport,
  onClose,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--hc-surface-raised)', border: '1px solid var(--hc-border)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--hc-border)' }}>
          <div>
            <h2 className="font-semibold text-base" style={{ color: 'var(--hc-text)' }}>{t('importExport.previewTitle')}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{t('importExport.rows', { count: preview.length })}</p>
          </div>
          <button type="button"
            onClick={onClose}
            className="hover:opacity-70 transition-opacity p-1"
            style={{ color: 'var(--hc-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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

        <div className="p-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--hc-border)' }}>
          <p className="text-xs flex-1" style={{ color: colorNotaImport(importErr, importOk) }}>
            {textoNotaImport(importErr, importOk, t)}
          </p>
          <div className="flex gap-2">
            <button type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--hc-surface-2)] hover:bg-[var(--hc-surface-3)] text-sm transition-colors"
              style={{ color: 'var(--hc-text)' }}
            >
              {t('importExport.cancel')}
            </button>
            <button type="button"
              onClick={onConfirm}
              disabled={importing || importOk || !onImport}
              className="px-4 py-2 rounded-lg bg-[var(--hc-accent)] hover:bg-[var(--hc-accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {importing ? t('importExport.importing') : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function colorNotaImport(importErr, importOk) {
  if (importErr) return 'var(--hc-danger)'
  if (importOk) return 'var(--hc-success)'
  return 'var(--hc-muted)'
}

function textoNotaImport(importErr, importOk, t) {
  if (importErr) return importErr
  if (importOk) return t('importExport.success')
  return t('importExport.previewNote')
}
