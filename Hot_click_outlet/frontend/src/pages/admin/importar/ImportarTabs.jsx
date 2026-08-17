import { TABS } from './importarHelpers'
import { IconCsv, IconGlobe, IconPdf, IconSpinner, IconUpload } from './importarIcons'

const ICONOS_TAB = {
  url: <IconGlobe />,
  pdf: <IconPdf />,
  csv: <IconCsv />,
}

export default function ImportarTabs({
  tab,
  onTab,
  url,
  setUrl,
  archivo,
  dragging,
  fileRef,
  onDrop,
  onDragOver,
  onDragLeave,
  setArchivoState,
  onExtraer,
  cargando,
}) {
  return (
    <>
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => onTab(t.id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === t.id ? 'var(--hc-surface)' : 'transparent',
              color:           tab === t.id ? 'var(--hc-text)'    : 'var(--hc-muted)',
              boxShadow:       tab === t.id ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            }}>
            {ICONOS_TAB[t.id]}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'url' && (
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
            URL de la tienda o página de productos
          </label>
          <input type="url" value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onExtraer()}
            placeholder="https://tiendacliente.com/productos"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          />
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            La URL debe ser pública. La IA extraerá automáticamente los productos que encuentre.
          </p>
        </div>
      )}

      {(tab === 'pdf' || tab === 'csv') && (
        <div
          role="button"
          tabIndex={0}
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileRef.current?.click()
            }
          }}
          className="flex flex-col items-center justify-center gap-3 p-10 rounded-xl cursor-pointer transition-all"
          style={{
            border: `2px dashed ${dragging ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
            backgroundColor: dragging ? 'rgba(231,59,51,0.04)' : 'var(--hc-surface-2)',
          }}>
          <input ref={fileRef} type="file" className="hidden"
            accept={tab === 'pdf' ? '.pdf' : '.csv,.txt'}
            onChange={e => setArchivoState(e.target.files[0] || null)} />
          <IconUpload />
          {archivo
            ? <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>{archivo.name}</p>
            : <>
                <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Arrastrá o hacé clic para subir</p>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{tab === 'pdf' ? 'PDF hasta 30 MB' : 'CSV hasta 5 MB'}</p>
              </>
          }
        </div>
      )}

      <button onClick={onExtraer} disabled={cargando}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
        style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
        {cargando
          ? <><IconSpinner /> {tab === 'pdf' ? 'Analizando con IA… (puede tardar unos minutos en PDFs escaneados)' : 'Analizando con IA…'}</>
          : 'Extraer productos'}
      </button>
    </>
  )
}
