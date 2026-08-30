import { useState, useEffect } from 'react'
import MainLayout from '@/layouts/MainLayout'
import { convenioService, listaConvenios } from '@/services/convenioService'
import EmprendimientosHero from './emprendimientos/EmprendimientosHero'
import EmprendimientosVacio from './emprendimientos/EmprendimientosVacio'
import ConvenioCard, { type ConvenioPublico } from './emprendimientos/ConvenioCard'

export default function EmprendimientosPage() {
  const [lista, setLista] = useState<ConvenioPublico[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    convenioService.getPublicos()
      .then((r) => setLista(listaConvenios(r) as ConvenioPublico[]))
      .catch((err: unknown) => { console.error('[EmprendimientosPage] convenios', err) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <MainLayout>
      <div style={{ minHeight: '60vh', background: 'var(--hc-bg)' }}>
        <EmprendimientosHero />
        <div className="max-w-7xl mx-auto px-5 sm:px-8" style={{ paddingTop: 48, paddingBottom: 64 }}>
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 20,
              }}
            >
              {lista.map((convenio, indice) => (
                <ConvenioCard key={convenio.id} convenio={convenio} indice={indice} />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
