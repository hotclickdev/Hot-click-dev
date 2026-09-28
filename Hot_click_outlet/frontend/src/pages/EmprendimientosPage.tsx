import { useState, useEffect, useMemo } from 'react'
import MainLayout from '@/layouts/MainLayout'
import { convenioService, listaConvenios } from '@/services/convenioService'
import EmprendimientosHero from './emprendimientos/EmprendimientosHero'
import EmprendimientosVacio from './emprendimientos/EmprendimientosVacio'
import BuscarNegocio from './emprendimientos/BuscarNegocio'
import ConvenioCard, { type ConvenioPublico } from './emprendimientos/ConvenioCard'

function coincide(convenio: ConvenioPublico, termino: string) {
  const t = termino.trim().toLowerCase()
  if (!t) return true
  return (convenio.nombre ?? '').toLowerCase().includes(t)
    || (convenio.descripcion ?? '').toLowerCase().includes(t)
}

export default function EmprendimientosPage() {
  const [lista, setLista] = useState<ConvenioPublico[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    convenioService.getPublicos()
      .then((r) => setLista(listaConvenios(r) as ConvenioPublico[]))
      .catch((err: unknown) => { console.error('[EmprendimientosPage] convenios', err) })
      .finally(() => setLoading(false))
  }, [])

  const filtrada = useMemo(() => lista.filter((c) => coincide(c, busqueda)), [lista, busqueda])

  return (
    <MainLayout>
      <div style={{ minHeight: '60vh', background: 'var(--hc-bg)' }}>
        <EmprendimientosHero />
        <div className="max-w-2xl mx-auto px-5 sm:px-8" style={{ paddingTop: 28, paddingBottom: 64 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--hc-muted)' }}>
              <div
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: '3px solid var(--hc-border)', borderTopColor: 'var(--hc-accent)',
                  animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
                }}
              />
              Cargando...
            </div>
          )}
          {!loading && lista.length === 0 && <EmprendimientosVacio />}
          {!loading && lista.length > 0 && (
            <>
              <BuscarNegocio value={busqueda} onChange={setBusqueda} />
              <p className="text-sm mt-5 mb-3" style={{ color: 'var(--hc-muted)' }}>
                {filtrada.length} {filtrada.length === 1 ? 'negocio' : 'negocios'}
              </p>
              {filtrada.length === 0 ? (
                <p className="text-sm text-center py-16" style={{ color: 'var(--hc-muted)' }}>
                  Ningún negocio coincide con “{busqueda}”.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {filtrada.map((convenio, indice) => (
                    <ConvenioCard key={convenio.id} convenio={convenio} indice={indice} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
