import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import directorioAtras from '@/assets/figma/tienda/directorio-atras.svg'
import MainLayout from '@/layouts/MainLayout'
import { convenioService, listaConvenios } from '@/services/convenioService'
import EmprendimientosVacio from './emprendimientos/EmprendimientosVacio'
import BuscarNegocio from './emprendimientos/BuscarNegocio'
import ConvenioCard, { type ConvenioPublico } from './emprendimientos/ConvenioCard'

function coincide(convenio: ConvenioPublico, termino: string) {
  const t = termino.trim().toLowerCase()
  if (!t) return true
  return (convenio.nombre ?? '').toLowerCase().includes(t)
    || (convenio.descripcion ?? '').toLowerCase().includes(t)
}

/**
 * Directorio de emprendimientos (Figma `29:1159`, móvil): barra propia con atrás y título (sin barra inferior), descripción,
 * buscador y lista de negocios. No hay frame de escritorio: es la misma columna, centrada.
 */
export default function EmprendimientosPage() {
  const { t } = useTranslation()
  const [lista, setLista] = useState<ConvenioPublico[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const navigate = useNavigate()
  const volver = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))

  useEffect(() => {
    convenioService.getPublicos()
      .then((r) => setLista(listaConvenios(r) as ConvenioPublico[]))
      .catch((err: unknown) => { console.error('[EmprendimientosPage] convenios', err) })
      .finally(() => setLoading(false))
  }, [])

  const filtrada = useMemo(() => lista.filter((c) => coincide(c, busqueda)), [lista, busqueda])

  return (
    <MainLayout variante="propia" barraInferior={false}>
      <div className="min-h-[60vh] bg-hc-n-50">
        <div className="border-b border-hc-n-200 bg-hc-n-0">
          <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-4 py-[14px]">
            <div className="flex items-center gap-3">
              <button type="button" onClick={volver} aria-label={t('common.back')} className="relative flex size-[22px] shrink-0 items-center justify-center text-hc-n-900 after:absolute after:-inset-2 after:content-[''] lg:hidden">
                <IconoFigma src={directorioAtras} size={22} />
              </button>
              <h1 className="font-display text-lg font-bold leading-[23px] text-hc-n-900 lg:text-2xl lg:leading-[normal]">{t('emprendimientos.titulo')}</h1>
            </div>
            <p className="text-[13px] leading-[18px] text-hc-n-600 lg:text-sm">
              {t('emprendimientos.intro')}
            </p>
            {lista.length > 0 && <BuscarNegocio value={busqueda} onChange={setBusqueda} />}
          </div>
        </div>

        <div className="mx-auto flex max-w-[720px] flex-col gap-[14px] px-4 pb-7 pt-4">
          {loading && (
            <div role="status" className="py-20 text-center text-sm text-hc-n-600">
              <div className="mx-auto mb-4 size-9 animate-spin rounded-full border-[3px] border-hc-n-200 border-t-hc-blue-600" />
              {t('common.loading')}
            </div>
          )}
          {!loading && lista.length === 0 && <EmprendimientosVacio />}
          {!loading && lista.length > 0 && (
            <>
              <p className="text-[13px] font-semibold leading-[normal] text-hc-n-600">
                {t('emprendimientos.negocios', { count: filtrada.length })}
              </p>
              {filtrada.length === 0 ? (
                <p className="py-16 text-center text-sm text-hc-n-600">
                  {t('emprendimientos.sinCoincidencias', { busqueda })}
                </p>
              ) : (
                filtrada.map((convenio, indice) => (
                  <ConvenioCard key={convenio.id} convenio={convenio} indice={indice} />
                ))
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
