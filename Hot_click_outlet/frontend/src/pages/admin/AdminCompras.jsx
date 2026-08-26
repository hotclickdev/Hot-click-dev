import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { compraService } from '@/services/compraService'
import { useToast } from '@/components/ui/Toast'
import ComprasOrdenList from './compras/ComprasOrdenList'
import RecibirModal from './compras/RecibirModal'
import { useAdminComprasActions } from './compras/useAdminComprasActions'
import { ESTADO_META, FILTROS_COMPRAS } from './compras/comprasHelpers'
import TextoMas from '@/components/ui/TextoMas'

export default function AdminCompras() {
  const { showToast } = useToast()
  const [ordenes, setOrdenes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('TODAS')
  const [expanded, setExpanded] = useState(null)
  const [recibirOrden, setRecibirOrden] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    compraService.listar()
      .then(setOrdenes)
      .catch(() => showToast('Error al cargar órdenes', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => { load() }, [load])

  const { handleCancelar } = useAdminComprasActions({ showToast, load })

  const ordenesFiltradas = filtro === 'TODAS'
    ? ordenes
    : ordenes.filter((o) => o.estado === filtro)

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Órdenes de compra</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {ordenesFiltradas.length} orden{ordenesFiltradas.length === 1 ? '' : 'es'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {FILTROS_COMPRAS.map((f) => (
              <button type="button" key={f} onClick={() => setFiltro(f)}
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  backgroundColor: filtro === f ? 'var(--hc-accent)' : 'var(--hc-surface)',
                  color: filtro === f ? '#fff' : 'var(--hc-muted)',
                }}>
                {f === 'TODAS' ? 'Todas' : ESTADO_META[f]?.label ?? f}
              </button>
            ))}
          </div>
          <Link to="/admin/compras/nueva"
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 inline-flex items-center"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            <TextoMas>Nueva orden</TextoMas>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
        </div>
      ) : (
        <ComprasOrdenList
          ordenesFiltradas={ordenesFiltradas}
          filtro={filtro}
          expanded={expanded}
          onToggleExpand={setExpanded}
          onRecibir={setRecibirOrden}
          onCancelar={handleCancelar}
        />
      )}

      {recibirOrden && (
        <RecibirModal
          orden={recibirOrden}
          onClose={() => setRecibirOrden(null)}
          onDone={() => { setRecibirOrden(null); load() }}
        />
      )}
    </div>
  )
}
