import { Link } from 'react-router-dom'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function AlertaSinCategorias({ onCerrar }: { onCerrar: () => void }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#8a5a00' }}>
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      <span>
        <span className="font-semibold">Sin categorías creadas.</span>{' '}Necesitás crear al menos una antes de publicar un producto.{' '}
        <Link to="/admin/categorias" className="underline font-medium" onClick={onCerrar}><TextoFlecha>Crear categoría</TextoFlecha></Link>
      </span>
    </div>
  )
}
