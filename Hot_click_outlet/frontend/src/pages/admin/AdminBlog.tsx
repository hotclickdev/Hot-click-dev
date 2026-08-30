import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/ui/Toast'
import { ventaService } from '@/services/orderService'
import { useAdminBlogActions } from './blog/useAdminBlogActions'
import BlogModal from './blog/BlogModal'
import BlogEntryList from './blog/BlogEntryList'
import { formPostSugerido, postSugeridoDeVentas, ventasDesdeRespuesta, type BlogForm, type ProductoSugerido } from './blog/blogHelpers'
import TextoMas from '@/components/ui/TextoMas'

type ModalBlog = 'new' | BlogForm | null

export default function AdminBlog() {
  const { showToast } = useToast()
  const [lista, setLista] = useState<BlogForm[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalBlog>(null)
  const [sugerido, setSugerido] = useState<ProductoSugerido | null>(null)

  const { fetchLista, handleSave, handleDelete, togglePublicado } = useAdminBlogActions({
    showToast,
    setLista,
    setLoading,
  })

  useEffect(() => { fetchLista() }, [fetchLista]) // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- carga al montar

  useEffect(() => {
    ventaService.getAll()
      .then(({ data }) => {
        setSugerido(postSugeridoDeVentas(ventasDesdeRespuesta(data)))
      })
      .catch((err: unknown) => console.error('[AdminBlog] top producto', err))
  }, [])

  const publicados = lista.filter(e => e.publicado).length

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--hc-text)', margin: 0 }}>Tu marca</h1>
          <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
            {publicados} publicado{publicados === 1 ? '' : 's'} · {lista.length - publicados} borrador{lista.length - publicados === 1 ? '' : 'es'}
          </p>
        </div>
        <button type="button" onClick={() => setModal('new')} className="inline-flex items-center" style={{
          padding: '9px 18px', borderRadius: 10,
          background: 'var(--hc-accent)', color: 'white',
          border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          <TextoMas>Nueva entrada</TextoMas>
        </button>
      </div>

      {sugerido && (
        <BannerPostSugerido producto={sugerido} onPublicar={() => setModal(formPostSugerido(sugerido))} />
      )}

      {loading && (
        <p style={{ color: 'var(--hc-muted)', textAlign: 'center', padding: 48 }}>Cargando...</p>
      )}
      {!loading && lista.length === 0 && (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--hc-muted)' }}>
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

function BannerPostSugerido({ producto, onPublicar }: { producto: ProductoSugerido; onPublicar: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      padding: '16px 18px', borderRadius: 16, marginBottom: 20,
      background: 'var(--hc-surface)', border: '1px solid var(--hc-border)',
    }}>
      {producto.imagenUrl && (
        <img src={producto.imagenUrl} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
      )}
      <div style={{ flex: 1, minWidth: 180 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--hc-accent)' }}>Publicá esto</p>
        <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--hc-text)' }}>{producto.nombre}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--hc-muted)' }}>Tu producto más pedido de los últimos 30 días.</p>
      </div>
      <button type="button" onClick={onPublicar}
        style={{
          padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'var(--hc-primary)', color: '#fff', fontSize: 13, fontWeight: 700,
        }}>
        Publicá / borrador
      </button>
    </div>
  )
}
