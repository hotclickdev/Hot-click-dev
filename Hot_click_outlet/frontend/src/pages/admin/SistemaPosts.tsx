import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/ui/Toast'
import { ventaService } from '@/services/orderService'
import { useAdminBlogActions } from './blog/useAdminBlogActions'
import BlogModal from './blog/BlogModal'
import { formPostSugerido, postSugeridoDeVentas, fmtDate } from './blog/blogHelpers'
import Spinner from '@/components/ui/Spinner'
import TextoFlecha from '@/components/ui/TextoFlecha'
import TextoMas from '@/components/ui/TextoMas'
import { listaOPagina } from './sistema-inicio/sistemaInicioHelpers'
import type { Id } from '@/types/api'

const CARD_SHADOW = '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)'

type EntradaBlog = {
  id?: Id
  titulo?: string
  imagenUrl?: string
  publicado?: boolean
  fechaPublicacion?: string
  resumen?: string
  contenido?: string
}

type PostSugerido = {
  id?: Id
  nombre?: string
  imagenUrl?: string
  ingreso?: number
}

type ModalPosts = 'new' | EntradaBlog | null

/**
 * Posts de la tienda para el dueño. Mockup Sistema - Posts.
 */
export default function SistemaPosts() {
  const { showToast } = useToast()
  const [lista, setLista] = useState<EntradaBlog[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalPosts>(null)
  const [sugerido, setSugerido] = useState<PostSugerido | null>(null)

  const { fetchLista, handleSave, handleDelete, togglePublicado } = useAdminBlogActions({
    showToast,
    setLista,
    setLoading,
  })

  useEffect(() => { fetchLista() }, [fetchLista])

  useEffect(() => {
    ventaService.getAll()
      .then(({ data }) => {
        const ventas = listaOPagina(data)
        setSugerido(postSugeridoDeVentas(ventas) as PostSugerido | null)
      })
      .catch((err: unknown) => console.error('[SistemaPosts] top producto', err))
  }, [])

  return (
    <div className="max-w-[1060px]">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold mb-4" style={{ color: 'var(--hc-text)' }}>
        <TextoFlecha dir="atras">Inicio</TextoFlecha>
      </Link>
      <header className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight m-0" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>Posts</h1>
          <p className="text-[15px] m-0 mt-1" style={{ color: '#6b6459' }}>Publicá novedades y promos en tu tienda de HOTCLICK.</p>
        </div>
        <button
          type="button"
          onClick={() => setModal('new')}
          className="inline-flex items-center justify-center px-[22px] py-[13px] rounded-[10px] text-[15px] font-bold"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          <TextoMas>Creá un post</TextoMas>
        </button>
      </header>

      {sugerido && (
        <button
          type="button"
          onClick={() => setModal(formPostSugerido(sugerido) as EntradaBlog)}
          className="w-full text-left rounded-2xl p-4 mb-5 flex items-center gap-4 flex-wrap"
          style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}
        >
          {sugerido.imagenUrl && <img src={sugerido.imagenUrl} alt="" className="w-12 h-12 rounded-[10px] object-cover" />}
          <div className="flex-1 min-w-[180px]">
            <p className="m-0 text-xs font-bold" style={{ color: 'var(--hc-accent)' }}>Publicá esto</p>
            <p className="m-0 mt-0.5 text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{sugerido.nombre}</p>
            <p className="m-0 mt-0.5 text-xs" style={{ color: '#6b6459' }}>Tu producto más pedido de los últimos 30 días.</p>
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--hc-primary)' }}>Publicá / borrador</span>
        </button>
      )}

      {loading && <div className="flex justify-center py-16"><Spinner size="lg" /></div>}
      {!loading && lista.length === 0 && (
        <p className="text-center py-16 text-sm" style={{ color: '#6b6459' }}>Todavía no tenés posts. Contale a tus clientes qué hay de nuevo.</p>
      )}
      {!loading && lista.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((e) => (
            <TarjetaPost
              key={e.id}
              entrada={e}
              onEdit={() => setModal(e)}
              onToggle={() => togglePublicado(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </section>
      )}

      <AnimatePresence>
        {modal && (
          <BlogModal entrada={modal === 'new' ? null : modal} onSave={handleSave} onClose={() => setModal(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function TarjetaPost({ entrada, onEdit, onToggle, onDelete }: {
  entrada: EntradaBlog
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <article className="rounded-2xl overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
      {entrada.imagenUrl
        ? <img src={entrada.imagenUrl} alt="" className="w-full aspect-[4/3] object-cover" />
        : <div className="w-full aspect-[4/3]" style={{ backgroundColor: 'var(--hc-surface-2)' }} />}
      <div className="p-4 flex flex-col gap-2">
        <p className="m-0 text-[15px] font-semibold leading-snug" style={{ color: 'var(--hc-text)' }}>{entrada.titulo}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={entrada.publicado ? { backgroundColor: '#e2f1e8', color: '#1E7F4F' } : { backgroundColor: '#efe9df', color: '#6b6459' }}>
            {entrada.publicado ? 'Publicado' : 'Borrador'}
          </span>
          <span className="text-[13px]" style={{ color: '#8a8378' }}>
            {entrada.publicado ? fmtDate(entrada.fechaPublicacion) : 'sin publicar'}
          </span>
        </div>
        <div className="flex gap-3.5">
          <button type="button" onClick={onEdit} className="text-sm font-semibold" style={{ color: 'var(--hc-accent)' }}>
            {entrada.publicado ? 'Editá' : 'Seguí editando'}
          </button>
          <button type="button" onClick={onToggle} className="text-sm font-semibold" style={{ color: '#6b6459' }}>
            {entrada.publicado ? 'Ocultá' : 'Publicá'}
          </button>
          <button type="button" onClick={onDelete} className="text-sm font-semibold" style={{ color: '#6b6459' }}>Borrá</button>
        </div>
      </div>
    </article>
  )
}
