import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/ui/Toast'
import { useAdminBlogActions } from './blog/useAdminBlogActions'
import BlogModal from './blog/BlogModal'
import BlogEntryList from './blog/BlogEntryList'

export default function AdminBlog() {
  const { showToast } = useToast()
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const { fetchLista, handleSave, handleDelete, togglePublicado } = useAdminBlogActions({
    showToast,
    setLista,
    setLoading,
  })

  useEffect(() => { fetchLista() }, [fetchLista]) // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- carga al montar

  const publicados = lista.filter(e => e.publicado).length

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--hc-text)', margin: 0 }}>Blog</h1>
          <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
            {publicados} publicado{publicados === 1 ? '' : 's'} · {lista.length - publicados} borrador{lista.length - publicados === 1 ? '' : 'es'}
          </p>
        </div>
        <button onClick={() => setModal('new')} style={{
          padding: '9px 18px', borderRadius: 10,
          background: 'var(--hc-accent)', color: 'white',
          border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          + Nueva entrada
        </button>
      </div>

      {loading && (
        <p style={{ color: 'var(--hc-muted)', textAlign: 'center', padding: 48 }}>Cargando...</p>
      )}
      {!loading && lista.length === 0 && (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--hc-muted)' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>📝</p>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Sin entradas aún</p>
        </div>
      )}
      {!loading && lista.length > 0 && (
        <BlogEntryList
          lista={lista}
          onTogglePublicado={togglePublicado}
          onEdit={setModal}
          onDelete={handleDelete}
        />
      )}

      <AnimatePresence>
        {modal && (
          <BlogModal
            entrada={modal === 'new' ? null : modal}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
