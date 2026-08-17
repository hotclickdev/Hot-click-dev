import { inicialDeMarca } from './formMarca'

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function LogoMarca({ marca, logoRoto, onLogoError }) {
  if (marca.logoUrl && !logoRoto) {
    return (
      <img
        src={marca.logoUrl}
        alt={marca.nombreMarca}
        className="w-full h-full object-contain p-2"
        onError={onLogoError}
      />
    )
  }
  return (
    <span className="text-2xl font-bold" style={{ color: 'var(--hc-accent)' }}>
      {inicialDeMarca(marca.nombreMarca)}
    </span>
  )
}

export default function MarcaCard({ marca, logoRoto, onEdit, onDelete, onLogoError }) {
  return (
    <div
      className="group rounded-2xl p-4 flex flex-col items-center gap-3 transition-colors"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
        style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
        <LogoMarca marca={marca} logoRoto={logoRoto} onLogoError={onLogoError} />
      </div>
      <p className="text-sm font-semibold text-center truncate w-full leading-tight" style={{ color: 'var(--hc-text)' }}>
        {marca.nombreMarca}
      </p>
      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(marca)}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hc-surface-2)]"
          style={{ color: 'var(--hc-muted)' }}
          title="Editar">
          <EditIcon />
        </button>
        <button
          onClick={() => onDelete(marca)}
          className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-400"
          style={{ color: 'var(--hc-muted)' }}
          title="Eliminar">
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}
