import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { posService } from '@/services/posService'
import { useToast } from '@/components/ui/Toast'
import ConteoEfectivo from './ConteoEfectivo'
import StatBox from './StatBox'
import PosReporteModal from './PosReporteModal'
import { formatMontoPos, mensajeErrorPos, type PosCierre, type PosTurno } from './posHelpers'
import { CheckIcon, TransferenciaIcon } from './posIcons'
import TextoFlecha from '@/components/ui/TextoFlecha'
import ThemeToggle from '@/components/ui/ThemeToggle'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { JsonBody } from '@/types/api'

export default function AdminPOSCaja() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [turno, setTurno]     = useState<PosTurno | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [montoDeclarado, setMontoDeclarado] = useState(0)
  const [notas, setNotas]     = useState('')
  const [cerrado, setCerrado] = useState<PosCierre | null>(null)
  const [reporteAbierto, setReporteAbierto] = useState(false)
  const [errorCerrar, setErrorCerrar] = useState(false)

  useEffect(() => {
    posService.getCajaActiva()
      .then((res: unknown) => setTurno((res as PosTurno | null | undefined)?.data ?? null))
      .catch(() => setTurno(null))
      .finally(() => setLoading(false))
  }, [])

  const handleCerrar = async () => {
    if (!turno) { showToast(t('pos.caja.toastNoTurno'), 'error'); return }
    setSaving(true)
    setErrorCerrar(false)
    try {
      const res = await posService.cerrarCaja(turno.id as number | string, { montoDeclarado, notas } as JsonBody) as PosCierre
      setCerrado(res.data ?? res)
      setTurno(null)
      showToast(t('pos.caja.toastCerrado'), 'success')
    } catch (err: unknown) {
      showToast(mensajeErrorPos(err, t('pos.caja.toastErrorCerrar')), 'error')
      setErrorCerrar(true)
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
      </div>
    )
  }

  /* ── Sin turno activo y ya cerrado ── */
  if (!turno && cerrado) {
    const diff = cerrado.diferencia ?? 0
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-end">
          <ThemeToggle className="min-h-11 min-w-11 flex shrink-0 items-center justify-center" />
        </div>
        <div className="rounded-3xl p-6 text-center space-y-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
            style={{ backgroundColor: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
            <CheckIcon />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34d399' }}>{t('pos.caja.turnoCerrado')}</p>
            <p className="text-3xl font-black mt-1 tabular-nums" style={{ color: 'var(--hc-text)' }}>
              ₡{formatMontoPos(cerrado.montoDeclarado ?? 0)}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{t('pos.caja.efectivoContado')}</p>
          </div>
          <div className="rounded-xl p-3 inline-block"
            style={{
              backgroundColor: diff === 0 ? 'rgba(52,211,153,0.08)' : diff > 0 ? 'rgba(251,191,36,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${diff === 0 ? 'rgba(52,211,153,0.2)' : diff > 0 ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t('pos.caja.diferencia')}</p>
            <p className="text-lg font-black tabular-nums"
              style={{ color: diff === 0 ? '#34d399' : diff > 0 ? '#fbbf24' : '#f87171' }}>
              {diff >= 0 ? '+' : ''}₡{formatMontoPos(diff)}
              <span className="text-xs font-medium ml-1">
                {diff > 0 ? t('pos.caja.sobrante') : diff < 0 ? t('pos.caja.faltante') : t('pos.caja.exacto')}
              </span>
            </p>
          </div>
        </div>
        <Link to="/admin/pos"
          className="block w-full py-4 rounded-2xl font-black text-center text-base"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}>
          <TextoFlecha dir="atras">{t('pos.common.volverAlPos')}</TextoFlecha>
        </Link>
      </div>
    )
  }

  /* ── Sin turno activo (nunca abrió) ── */
  if (!turno) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6 text-center">
        <div className="flex justify-end">
          <ThemeToggle className="min-h-11 min-w-11 flex shrink-0 items-center justify-center" />
        </div>
        <div className="rounded-2xl p-8"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center" style={{ color: 'var(--hc-muted)' }}>
            <TransferenciaIcon className="w-10 h-10" />
          </div>
          <p className="font-bold" style={{ color: 'var(--hc-text)' }}>{t('pos.caja.noHayTurno')}</p>
          <p className="text-sm mt-2" style={{ color: 'var(--hc-muted)' }}>
            {t('pos.caja.abriDesdePos')}
          </p>
        </div>
        <Link to="/admin/pos"
          className="flex w-full py-4 rounded-2xl font-black items-center justify-center gap-1 text-base"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}>
          {t('pos.caja.irAlPos')} <TrustGlyph tipo="adelante" className="w-3.5 h-3.5" /> {t('pos.caja.abrirTurnoHint')}
        </Link>
      </div>
    )
  }

  /* ── Turno activo — cuadre de cierre ── */
  const esperado = (turno.montoInicial ?? 0) + (turno.totalEfectivo ?? 0)
  const diff = montoDeclarado > 0 ? montoDeclarado - esperado : null

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link to="/admin/pos" className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>
            <TextoFlecha dir="atras">{t('pos.common.volverAlPos')}</TextoFlecha>
          </Link>
          <h1 className="text-xl font-bold mt-1" style={{ color: 'var(--hc-text)' }}>{t('pos.caja.title')}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {t('pos.caja.pasoCierre')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="min-h-11 min-w-11 flex shrink-0 items-center justify-center" />
          <button
            type="button"
            onClick={() => setReporteAbierto(true)}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ color: 'var(--hc-muted)' }}
            aria-label={t('pos.reporte.botonAria')}
          >
            {t('pos.header.reportar')}
          </button>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium text-green-400"
            style={{ backgroundColor: 'rgba(52,211,153,0.12)' }}>
            {t('pos.common.turnoActivo')}
          </span>
        </div>
      </div>

      {/* KPIs del turno */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label={t('pos.caja.efectivoCobrado')}  value={turno.totalEfectivo}      color="#34d399"/>
        <StatBox label={t('pos.caja.sinpe')}             value={turno.totalSinpe}          color="#6490EA"/>
        <StatBox label={t('pos.caja.tarjeta')}           value={turno.totalTarjeta}        color="#7aa3ff"/>
        <StatBox label={t('pos.caja.transferencia')}     value={turno.totalTransferencia}  color="#fbbf24"/>
      </div>

      <div className="rounded-xl px-4 py-3 flex justify-between items-center"
        style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
        <div>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t('pos.caja.ventasDelTurno')}</p>
          <p className="text-2xl font-black" style={{ color: 'var(--hc-accent)' }}>{turno.numTransacciones ?? 0}</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t('pos.caja.efectivoInicial')}</p>
          <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>₡{formatMontoPos(turno.montoInicial)}</p>
        </div>
      </div>

      {/* Conteo final */}
      <div className="rounded-2xl p-5 space-y-5"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div>
          <p className="font-semibold mb-1" style={{ color: 'var(--hc-text)' }}>{t('pos.caja.contaFisico')}</p>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            {t('pos.caja.incluyeInicial')}
          </p>
        </div>

        <ConteoEfectivo label={t('pos.caja.totalContado')} onTotal={setMontoDeclarado} totalColor="var(--hc-accent)" />

        {/* Diferencia */}
        {diff !== null && (
          <div className="rounded-xl p-3"
            style={{
              backgroundColor: diff === 0 ? 'rgba(52,211,153,0.06)' : diff > 0 ? 'rgba(251,191,36,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${diff === 0 ? 'rgba(52,211,153,0.2)' : diff > 0 ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t('pos.caja.diferenciaDetalle')}</p>
            <p className="font-black text-lg tabular-nums mt-0.5"
              style={{ color: diff === 0 ? '#34d399' : diff > 0 ? '#fbbf24' : '#f87171' }}>
              {diff >= 0 ? '+' : ''}₡{formatMontoPos(diff)}
              <span className="text-xs font-medium ml-1.5">
                {diff > 0 ? t('pos.caja.sobrantePlain') : diff < 0 ? t('pos.caja.faltantePlain') : t('pos.caja.cuadreExacto')}
              </span>
            </p>
          </div>
        )}

        {/* Notas */}
        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{t('pos.caja.notasLabel')}</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
            placeholder={t('pos.caja.notasPh')}
            className="w-full mt-1.5 px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}/>
        </div>

        <button type="button" onClick={handleCerrar} disabled={saving || montoDeclarado === 0}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: 'rgba(239,68,68,0.8)', color: '#fff' }}>
          {saving ? t('pos.caja.cerrando') : montoDeclarado === 0 ? t('pos.caja.contaPrimero') : t('pos.caja.cerrarTurno')}
        </button>

        {errorCerrar && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setReporteAbierto(true)}
              className="text-xs font-semibold underline-offset-2 hover:underline"
              style={{ color: 'var(--hc-muted)' }}
              aria-label={t('pos.reporte.botonAria')}
            >
              {t('pos.header.reportar')}
            </button>
          </div>
        )}
      </div>

      <PosReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        pasoActual="caja"
      />
    </div>
  )
}
