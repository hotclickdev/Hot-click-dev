import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { garantiaService } from '@/services/garantiaService'
import GarantiaList from './solicitudesGarantia/GarantiaList'
import GarantiaDetalleDrawer from './solicitudesGarantia/GarantiaDetalleDrawer'
import { useAdminGarantiaActions } from './solicitudesGarantia/useAdminGarantiaActions'

export default function AdminSolicitudesGarantia() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState('TODOS')
  const [selected, setSelected] = useState(null)
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ['admin-solicitudes-garantia'],
    queryFn: () => garantiaService.listarTodas().then(r => r.data?.data ?? []),
    refetchInterval: 60_000,
  })

  const { openDetalle, handleGuardar } = useAdminGarantiaActions({
    selected,
    nuevoEstado,
    notas,
    qc,
    setSelected,
    setNuevoEstado,
    setNotas,
    setSaving,
  })

  return (
    <>
      <GarantiaList
        solicitudes={solicitudes}
        filtro={filtro}
        isLoading={isLoading}
        onOpenDetalle={openDetalle}
        onSetFiltro={setFiltro}
      />

      <AnimatePresence>
        {selected && (
          <GarantiaDetalleDrawer
            selected={selected}
            nuevoEstado={nuevoEstado}
            notas={notas}
            saving={saving}
            onClose={() => setSelected(null)}
            onNuevoEstado={setNuevoEstado}
            onNotas={setNotas}
            onGuardar={handleGuardar}
          />
        )}
      </AnimatePresence>
    </>
  )
}
