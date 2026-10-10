import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { consolaService } from '@/pages/plataforma/consola'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, Chip, TARJETA } from '@/pages/plataforma/piezas'
import { destinoPaso, pasosDe, type PasoOnboarding } from '@/pages/plataforma/tiendaRapida'
import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'

const TONO = { HECHO: 'ok', OMITIDO: 'neutro', PENDIENTE: 'azul', BLOQUEADO: 'neutro' } as const

/**
 * Onboarding del negocio asignado por enlace (derivado de Figma: tarjetas de Opciones 352:9400
 * y barra de avance del alta de vendedor). Una sola CTA roja: el paso siguiente.
 */
export default function NegocioRapidoOnboardingPage() {
  const { t } = useTranslation()
  const [pasos, setPasos] = useState<PasoOnboarding[]>([])
  const [siguiente, setSiguiente] = useState<string | null>(null)
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [ocupado, setOcupado] = useState(false)

  const aplicar = useCallback((data: unknown) => {
    setPasos(pasosDe(data))
    const sig = data && typeof data === 'object' ? (data as { siguiente?: unknown }).siguiente : null
    setSiguiente(typeof sig === 'string' ? sig : null)
    setEstado('listo')
  }, [])

  useEffect(() => {
    consolaService.onboardingRapido()
      .then((r) => aplicar(r.data))
      .catch((err: unknown) => {
        console.error(err)
        setEstado('error')
      })
  }, [aplicar])

  async function marcar(paso: string, accion: 'HECHO' | 'OMITIR') {
    setOcupado(true)
    try {
      aplicar((await consolaService.marcarPasoRapido(paso, accion)).data)
    } catch (err) {
      console.error(err)
      setEstado('error')
    } finally {
      setOcupado(false)
    }
  }

  const hechos = pasos.filter((p) => p.estado === 'HECHO' || p.estado === 'OMITIDO').length
  const avance = pasos.length ? Math.round((hechos / pasos.length) * 100) : 0

  return (
    <EmprendedorPageFrame titulo={t('negocioRapido.onboarding.titulo')} volverA={RUTA_EMPRENDEDOR} subtitulo={t('negocioRapido.onboarding.sub')}>
      {estado === 'carga' && <p className={`${TARJETA} text-sm text-hc-n-600`}>…</p>}
      {estado === 'error' && <p role="alert" className={`${TARJETA} text-sm text-hc-n-600`}>{t('negocioRapido.onboarding.error')}</p>}
      {estado === 'listo' && (
        <>
          <div className="h-1.5 overflow-hidden rounded-full bg-hc-n-100" aria-hidden="true">
            <div className="h-full rounded-full bg-hc-primary transition-all duration-500 motion-reduce:transition-none" style={{ width: `${avance}%` }} />
          </div>
          <ol className="flex flex-col gap-3">
            {pasos.map((p, i) => {
              const actual = p.paso === siguiente
              return (
                <li key={p.paso} data-paso={p.paso} className={`${TARJETA} flex flex-col gap-2 ${actual ? 'border-hc-blue-600' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-[17px] font-bold leading-6 text-hc-n-900">
                        {i + 1}. {t(`negocioRapido.onboarding.paso.${p.paso}.titulo`)}
                      </p>
                      <p className="text-sm text-hc-n-600">{t(`negocioRapido.onboarding.paso.${p.paso}.texto`)}</p>
                    </div>
                    <Chip tono={TONO[p.estado as keyof typeof TONO] ?? 'neutro'}>
                      {t(`negocioRapido.onboarding.estado.${p.estado}`, { defaultValue: p.estado })}
                    </Chip>
                  </div>
                  {actual && (
                    <div className="flex flex-wrap gap-2">
                      <Link className={`${BOTON_PRIMARIO} flex-1`} to={destinoPaso(p.paso)}>{t('negocioRapido.onboarding.seguir')}</Link>
                      {p.omitible && (
                        <>
                          <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => void marcar(p.paso, 'HECHO')}>
                            {t('negocioRapido.onboarding.hecho')}
                          </button>
                          <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => void marcar(p.paso, 'OMITIR')}>
                            {t('negocioRapido.onboarding.omitir')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
          {siguiente === null && (
            <section className={TARJETA}>
              <p className="text-sm text-hc-n-900">{t('negocioRapido.onboarding.completo')}</p>
              <Link className={`${BOTON_PRIMARIO} mt-3 w-full`} to={RUTA_EMPRENDEDOR}>{t('negocioRapido.onboarding.irPanel')}</Link>
            </section>
          )}
        </>
      )}
    </EmprendedorPageFrame>
  )
}
