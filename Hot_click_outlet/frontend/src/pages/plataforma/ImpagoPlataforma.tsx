import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { adminSuspensionService, type PanelImpago } from '@/services/adminSuspensionService'
import { motivoValido, panelDe, tonoDias } from './impagoAdmin'
import { Aviso, BOTON_SECUNDARIO, BOTON_PRIMARIO, Carga, Chip, TARJETA } from './piezas'

type Accion = { tipo: 'suspender' | 'extension'; empresaId: number; nombre: string }

/** Admin: tiendas en gracia (días que les quedan), suspensión manual y "Dar N días extra" una vez por ciclo. */
export default function ImpagoPlataforma() {
  const { t } = useTranslation()
  const [panel, setPanel] = useState<PanelImpago | null>(null)
  const [error, setError] = useState(false)
  const [accion, setAccion] = useState<Accion | null>(null)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const cargar = useCallback(() => {
    adminSuspensionService.listar()
      .then((r) => { setPanel(panelDe(r.data)); setError(false) })
      .catch(() => setError(true))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const confirmar = async () => {
    if (!accion || !motivoValido(motivo)) return
    setOcupado(true)
    setFallo(null)
    try {
      if (accion.tipo === 'suspender') await adminSuspensionService.suspender(accion.empresaId, motivo.trim())
      else await adminSuspensionService.darExtension(accion.empresaId, motivo.trim())
      setAccion(null)
      setMotivo('')
      cargar()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFallo(msg || t('impagoAdmin.error'))
    } finally {
      setOcupado(false)
    }
  }

  if (error) return <Aviso>{t('impagoAdmin.error')}</Aviso>
  if (!panel) return <Carga />
  const dias = panel.diasExtension

  return (
    <div className="flex flex-col gap-4">
      <section className={TARJETA}>
        <h2 className="font-display text-[17px] font-bold">{t('impagoAdmin.enGracia')}</h2>
        {panel.enGracia.length === 0 ? <p className="mt-2 text-sm text-hc-n-600">{t('impagoAdmin.sinGracia')}</p> : (
          <ul className="mt-2 flex flex-col gap-2">
            {panel.enGracia.map((f) => (
              <li key={f.empresaId} className="flex flex-wrap items-center justify-between gap-2">
                <Link className="font-semibold text-hc-blue-600" to={`/plataforma/negocios/${f.empresaId}`}>{f.nombreEmpresa ?? `#${f.empresaId}`}</Link>
                <Chip tono={tonoDias(f.diasRestantes)}>{t('impagoAdmin.diasRestantes', { count: f.diasRestantes })}</Chip>
                <button type="button" className={BOTON_SECUNDARIO}
                  onClick={() => { setAccion({ tipo: 'suspender', empresaId: f.empresaId, nombre: f.nombreEmpresa ?? '' }); setMotivo(''); setFallo(null) }}>
                  {t('impagoAdmin.suspender')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={TARJETA}>
        <h2 className="font-display text-[17px] font-bold">{t('impagoAdmin.suspendidas')}</h2>
        {panel.suspendidas.length === 0 ? <p className="mt-2 text-sm text-hc-n-600">{t('impagoAdmin.sinSuspendidas')}</p> : (
          <ul className="mt-2 flex flex-col gap-2">
            {panel.suspendidas.map((f) => (
              <li key={f.empresaId} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{f.nombreEmpresa ?? `#${f.empresaId}`}</span>
                <Chip tono={f.estado === 'EXTENSION_IMPAGO' ? 'azul' : 'alerta'}>
                  {f.estado === 'EXTENSION_IMPAGO' ? t('impagoAdmin.enExtension', { fecha: f.extensionVenceEn ?? '' }) : t('impagoAdmin.suspendida')}
                </Chip>
                {f.extensionDisponible ? (
                  <button type="button" className={BOTON_SECUNDARIO}
                    onClick={() => { setAccion({ tipo: 'extension', empresaId: f.empresaId, nombre: f.nombreEmpresa ?? '' }); setMotivo(''); setFallo(null) }}>
                    {t('impagoAdmin.darExtension', { count: dias })}
                  </button>
                ) : f.estado === 'SUSPENDIDO_IMPAGO' && <span className="text-xs text-hc-n-600">{t('impagoAdmin.extensionUsada')}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {accion && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setAccion(null) }}
          onKeyDown={(e) => { if (e.key === 'Escape') setAccion(null) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="impago-titulo" className="flex w-full max-w-[440px] flex-col gap-3 rounded-t-[16px] bg-hc-surface p-5 md:rounded-[16px]">
            <h2 id="impago-titulo" className="font-display text-[18px] font-bold">
              {accion.tipo === 'suspender' ? t('impagoAdmin.confirmarSuspender', { nombre: accion.nombre }) : t('impagoAdmin.confirmarExtension', { nombre: accion.nombre, count: dias })}
            </h2>
            <p className="text-sm">{accion.tipo === 'suspender' ? t('impagoAdmin.textoSuspender') : t('impagoAdmin.textoExtension', { count: dias })}</p>
            <label className="flex flex-col gap-1 text-sm">
              {t('impagoAdmin.motivo')}
              <textarea className="rounded-lg border border-hc-n-200 p-2" maxLength={400} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </label>
            {fallo && <p role="alert" className="text-sm text-red-600">{fallo}</p>}
            <button type="button" className={BOTON_PRIMARIO} disabled={ocupado || !motivoValido(motivo)} onClick={() => { void confirmar() }}>
              {accion.tipo === 'suspender' ? t('impagoAdmin.suspender') : t('impagoAdmin.darExtension', { count: dias })}
            </button>
            <button type="button" className={BOTON_SECUNDARIO} onClick={() => setAccion(null)}>{t('impagoAdmin.cancelar')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
