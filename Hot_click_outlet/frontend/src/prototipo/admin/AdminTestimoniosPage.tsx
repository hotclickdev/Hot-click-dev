import { TESTIMONIOS } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminBadge } from './AdminUi'

/**
 * Admin · Testimonios (Figma 85:262).
 */
export default function AdminTestimoniosPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader
        titulo="Testimonios"
        subtitulo="Reseñas de compradores en la plataforma"
        atras="/prototipo/admin/herramientas"
      />
      <ul className="flex flex-col gap-4">
        {TESTIMONIOS.map((t) => (
          <li key={t.id} className="rounded-lg border border-hc-border p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium">{t.autor}</p>
                <p className="text-[10px] text-hc-muted">{t.sobre}</p>
              </div>
              <p className="text-xs text-hc-muted">{t.puntos} de 5</p>
            </div>
            <p className="mt-3 text-sm text-hc-muted">“{t.texto}”</p>
            <div className="mt-3">
              <AdminBadge tono={t.visible ? 'ok' : 'muted'}>{t.visible ? 'Visible' : 'Oculto'}</AdminBadge>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
