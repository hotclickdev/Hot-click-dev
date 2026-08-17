import { motion } from 'framer-motion'
import { fmtDate } from './blogHelpers'

export default function BlogEntryList({ lista, onTogglePublicado, onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {lista.map(e => (
        <motion.div key={e.id}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px',
            background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)',
            borderRadius: 12, flexWrap: 'wrap',
          }}
        >
          {e.imagenUrl && (
            <img src={e.imagenUrl} alt={e.titulo} style={{ width: 56, height: 40, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--hc-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.titulo}
            </p>
            <p style={{ fontSize: 11, color: 'var(--hc-muted)', margin: '2px 0 0' }}>
              {fmtDate(e.publicado ? e.fechaPublicacion : e.fechaCreacion)}
              {e.resumen && <span> · {e.resumen.substring(0, 60)}{e.resumen.length > 60 ? '...' : ''}</span>}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: e.publicado ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)',
              color: e.publicado ? 'var(--hc-success)' : 'var(--hc-warning)',
              border: `1px solid ${e.publicado ? 'rgba(5,150,105,0.3)' : 'rgba(245,158,11,0.3)'}`,
            }}>
              {e.publicado ? 'Publicado' : 'Borrador'}
            </span>
            <button onClick={() => onTogglePublicado(e)} style={{
              padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
              border: '1px solid var(--hc-border)', background: 'var(--hc-surface)',
              color: 'var(--hc-text-2)', cursor: 'pointer',
            }}>
              {e.publicado ? 'Despublicar' : 'Publicar'}
            </button>
            <button onClick={() => onEdit(e)} style={{
              padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--hc-border)', background: 'var(--hc-surface)',
              color: 'var(--hc-text)', cursor: 'pointer',
            }}>
              Editar
            </button>
            <button onClick={() => onDelete(e.id)} style={{
              padding: '5px 10px', borderRadius: 7, fontSize: 12,
              border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)',
              color: '#dc2626', cursor: 'pointer',
            }}>
              ×
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
