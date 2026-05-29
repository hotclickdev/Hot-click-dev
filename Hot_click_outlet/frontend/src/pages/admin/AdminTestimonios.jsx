import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { testimonioService } from '@/services/testimonioService'

const ESTADO_STYLES = {
  PENDIENTE:  { bg: 'rgba(217,119,6,0.1)',   text: '#d97706', border: 'rgba(217,119,6,0.25)' },
  APROBADO:   { bg: 'rgba(5,150,105,0.1)',   text: '#059669', border: 'rgba(5,150,105,0.25)' },
  RECHAZADO:  { bg: 'rgba(220,38,38,0.08)',  text: '#dc2626', border: 'rgba(220,38,38,0.2)' },
}

const ESTADO_LABELS = { PENDIENTE: 'Pendiente', APROBADO: 'Aprobado', RECHAZADO: 'Rechazado' }

export default function AdminTestimonios() {
  const toast = useToast()
  const [testimonios, setTestimonios] = useState([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState('TODOS')
  const [working, setWorking]         = useState(null) // id en proceso

  useEffect(() => {
    setLoading(true)
    testimonioService.getAdmin()
      .then(({ data }) => setTestimonios(data?.data ?? []))
      .catch(() => toast({ message: 'Error al cargar testimonios', type: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  const handle = async (id, accion) => {
    setWorking(id)
    try {
      accion === 'aprobar'
        ? await testimonioService.aprobar(id)
        : await testimonioService.rechazar(id)
      setTestimonios(prev =>
        prev.map(t => t.id === id
          ? { ...t, estado: accion === 'aprobar' ? 'APROBADO' : 'RECHAZADO' }
          : t
        )
      )
      toast({ message: accion === 'aprobar' ? 'Testimonio aprobado' : 'Testimonio rechazado', type: 'success' })
    } catch {
      toast({ message: 'Error al procesar', type: 'error' })
    } finally {
      setWorking(null)
    }
  }

  const FILTROS = ['TODOS', 'PENDIENTE', 'APROBADO', 'RECHAZADO']
  const visible = filter === 'TODOS' ? testimonios : testimonios.filter(t => t.estado === filter)

  const pendienteCount = testimonios.filter(t => t.estado === 'PENDIENTE').length

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>
              Testimonios
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
              Moderación de reseñas de clientes
            </p>
          </div>
          {pendienteCount > 0 && (
            <span className="text-sm font-bold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(217,119,6,0.15)', color: '#d97706' }}>
              {pendienteCount} pendiente{pendienteCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                backgroundColor: filter === f ? 'var(--hc-accent)' : 'var(--hc-surface)',
                color: filter === f ? '#fff' : 'var(--hc-muted)',
                border: `1px solid ${filter === f ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
              }}
            >
              {f === 'TODOS' ? 'Todos' : ESTADO_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border"
            style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}>
            <p className="text-4xl opacity-30">💬</p>
            <p className="mt-3 text-sm" style={{ color: 'var(--hc-muted)' }}>No hay testimonios en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((t, i) => {
              const s = ESTADO_STYLES[t.estado] ?? ESTADO_STYLES.PENDIENTE
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border p-5 space-y-3"
                  style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Info usuario */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#4f7cff]/20 flex items-center justify-center text-sm font-bold text-[#4f7cff] shrink-0">
                        {(t.nombreUsuario?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--hc-text)' }}>
                          {t.nombreUsuario ?? 'Cliente'}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--hc-muted)' }}>
                          {t.correoUsuario}
                        </p>
                      </div>
                    </div>
                    {/* Estado */}
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                      {ESTADO_LABELS[t.estado]}
                    </span>
                  </div>

                  {/* Comentario + imagen */}
                  <div className="flex gap-4">
                    <p className="text-sm flex-1" style={{ color: 'var(--hc-text)' }}>{t.comentario}</p>
                    {t.imagenUrl && (
                      <img
                        src={t.imagenUrl}
                        alt="testimonio"
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                    )}
                  </div>

                  {/* Fecha + acciones */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
                      {t.fechaCreacion
                        ? new Date(t.fechaCreacion).toLocaleString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : ''}
                    </span>
                    {t.estado === 'PENDIENTE' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={working === t.id}
                          onClick={() => handle(t.id, 'rechazar')}
                          style={{ color: '#dc2626' }}
                        >
                          Rechazar
                        </Button>
                        <Button
                          size="sm"
                          loading={working === t.id}
                          onClick={() => handle(t.id, 'aprobar')}
                        >
                          Aprobar
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
