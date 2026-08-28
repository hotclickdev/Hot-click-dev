import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { servicioService } from '@/services/servicioService'
import ServicioList from './solicitudesServicio/ServicioList'
import ServicioDetalleDrawer, { ServicioFotoLightbox } from './solicitudesServicio/ServicioDetalleDrawer'
import { useAdminServicioActions } from './solicitudesServicio/useAdminServicioActions'
import type { SolicitudServicio } from './solicitudesServicio/servicioHelpers'

export default function AdminSolicitudesServicio() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [selected, setSelected] = useState<SolicitudServicio | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [fotoModal, setFotoModal] = useState<string | null>(null)

  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ['admin-solicitudes-servicio'],
    queryFn: () => servicioService.listarTodas().then(r => r.data as SolicitudServicio[]),
  })

  const { openDetalle, handleGuardar, handleEliminar } = useAdminServicioActions({
    selected,
    nuevoEstado,
    notas,
    qc,
    t,
    setSelected,
    setNuevoEstado,
    setNotas,
    setSaving,
  })

  return (
    <>
      <ServicioList
        solicitudes={solicitudes}
        filtroEstado={filtroEstado}
        isLoading={isLoading}
        onOpenDetalle={openDetalle}
        onSetFiltro={setFiltroEstado}
      />

      <AnimatePresence>
        {selected && (
          <ServicioDetalleDrawer
            selected={selected}
            nuevoEstado={nuevoEstado}
            notas={notas}
            saving={saving}
            onClose={() => setSelected(null)}
            onNuevoEstado={setNuevoEstado}
            onNotas={setNotas}
            onGuardar={handleGuardar}
            onEliminar={handleEliminar}
            onFotoModal={setFotoModal}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fotoModal && (
          <ServicioFotoLightbox fotoModal={fotoModal} onClose={() => setFotoModal(null)} />
        )}
      </AnimatePresence>
    </>
  )
}
