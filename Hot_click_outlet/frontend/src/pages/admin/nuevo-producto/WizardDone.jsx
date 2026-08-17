import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'

export default function WizardDone({ productoCreado, form, onReset }) {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 text-center py-8 max-w-xs mx-auto">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${productoCreado?.pendienteAprobacion ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-emerald-500/15 border border-emerald-500/30'}`}>
        {productoCreado?.pendienteAprobacion ? (
          <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="9"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3"/>
          </svg>
        ) : (
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        )}
      </div>
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>
          {productoCreado?.pendienteAprobacion ? 'Producto enviado a revisión' : '¡Producto publicado!'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{productoCreado?.nombre}</p>
        {productoCreado?.pendienteAprobacion && (
          <p className="text-xs mt-2" style={{ color: '#8a5a00' }}>
            Un admin lo va a revisar antes de que aparezca en el catálogo público. Te avisamos cuando esté aprobado.
          </p>
        )}
      </div>
      {productoCreado?.imagen && (
        <img src={productoCreado.imagen} alt=""
          className="w-28 h-28 object-cover rounded-2xl mx-auto" style={{ border: '1px solid var(--hc-border)' }} />
      )}
      <div className="flex flex-col gap-3">
        <Button onClick={() => navigate('/admin/productos')}>Ver todos los productos</Button>
        <button type="button" onClick={onReset}
          className="py-2.5 rounded-xl text-sm transition-colors hover:bg-[var(--hc-surface-2)]"
          style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
          Agregar otro producto
        </button>
      </div>
      <div className="text-left rounded-xl p-4 space-y-2" style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--hc-accent)' }}>Hacelo aún mejor</p>
        <ul className="text-xs space-y-1.5" style={{ color: 'var(--hc-muted)' }}>
          <li>• Editalo para añadir descripción larga y especificaciones</li>
          <li>• Activalo en el carrusel para más visibilidad en la tienda</li>
          {!form.seoByLang?.es?.title && <li>• Configurá el SEO para aparecer en Google</li>}
        </ul>
      </div>
    </div>
  )
}
