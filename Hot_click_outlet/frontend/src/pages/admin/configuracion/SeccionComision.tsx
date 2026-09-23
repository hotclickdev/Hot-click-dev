import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { paymentService } from '@/services/paymentService'
import Spinner from '@/components/ui/Spinner'
import { Block, FormGroup, StyledInput, SectionHeader, mensajeErrorConfig } from './configUi'
import {
  COMISION_GATEWAY_FIJO_DEFAULT,
  COMISION_GATEWAY_PCT_DEFAULT,
  parseConfigComision,
  type ConfigComision,
} from '@/utils/comisionPrecio'

type ToastFn = (opts: { message: string; type: 'success' | 'error' | 'info' }) => void

type SeccionComisionProps = {
  toast: ToastFn
}

/**
 * Comisión Tilopay absorbida en precio + descuento SINPE opcional (por empresa).
 */
export default function SeccionComision({ toast }: SeccionComisionProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pctTarjeta, setPctTarjeta] = useState(String(COMISION_GATEWAY_PCT_DEFAULT))
  const [fijoCrc, setFijoCrc] = useState(String(COMISION_GATEWAY_FIJO_DEFAULT))
  const [pctSinpe, setPctSinpe] = useState('0')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    paymentService.getConfigComision()
      .then(({ data }) => {
        if (cancelled) return
        aplicarForm(parseConfigComision(data), setPctTarjeta, setFijoCrc, setPctSinpe)
      })
      .catch(() => {
        if (!cancelled) {
          toast({ message: t('adminConfig.comisionErrorLoad'), type: 'error' })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [t, toast])

  async function onGuardar() {
    const pct = Number(pctTarjeta)
    const fijo = Number(fijoCrc)
    const sinpe = Number(pctSinpe)
    if (!Number.isFinite(pct) || pct < 0 || pct >= 99) {
      toast({ message: t('adminConfig.comisionPctInvalid'), type: 'error' })
      return
    }
    if (!Number.isFinite(fijo) || fijo < 0) {
      toast({ message: t('adminConfig.comisionFijoInvalid'), type: 'error' })
      return
    }
    if (!Number.isFinite(sinpe) || sinpe < 0 || sinpe > 50) {
      toast({ message: t('adminConfig.comisionSinpeInvalid'), type: 'error' })
      return
    }
    setSaving(true)
    try {
      const { data } = await paymentService.putConfigComision({
        pctComisionTarjeta: pct,
        montoFijoComisionCrc: Math.round(fijo),
        pctDescuentoSinpe: sinpe,
      })
      aplicarForm(parseConfigComision(data), setPctTarjeta, setFijoCrc, setPctSinpe)
      toast({ message: t('adminConfig.comisionSaved'), type: 'success' })
    } catch (err: unknown) {
      toast({ message: mensajeErrorConfig(err, t('adminConfig.comisionErrorSave')), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader
        title={t('adminConfig.comisionTitle')}
        desc={t('adminConfig.comisionDesc')}
      />

      <Block
        label={t('adminConfig.comisionTarjetaBlock')}
        sublabel={t('adminConfig.comisionTarjetaHint')}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <FormGroup label={t('adminConfig.comisionPctLabel')} hint={t('adminConfig.comisionPctHint')}>
            <StyledInput
              type="number"
              min={0}
              max={98}
              step="0.01"
              value={pctTarjeta}
              onChange={(e) => setPctTarjeta(e.target.value)}
            />
          </FormGroup>
          <FormGroup label={t('adminConfig.comisionFijoLabel')} hint={t('adminConfig.comisionFijoHint')}>
            <StyledInput
              type="number"
              min={0}
              step={1}
              value={fijoCrc}
              onChange={(e) => setFijoCrc(e.target.value)}
            />
          </FormGroup>
        </div>
      </Block>

      <Block
        label={t('adminConfig.comisionSinpeBlock')}
        sublabel={t('adminConfig.comisionSinpeHint')}
      >
        <FormGroup label={t('adminConfig.comisionSinpePctLabel')}>
          <StyledInput
            type="number"
            min={0}
            max={50}
            step="0.1"
            value={pctSinpe}
            onChange={(e) => setPctSinpe(e.target.value)}
          />
        </FormGroup>
      </Block>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="cfg-btn cfg-btn-primary"
          disabled={saving}
          onClick={() => void onGuardar()}
        >
            {saving ? t('adminConfig.comisionSaving') : t('adminConfig.comisionSave')}
        </button>
      </div>
    </div>
  )
}

function aplicarForm(
  cfg: ConfigComision,
  setPct: (v: string) => void,
  setFijo: (v: string) => void,
  setSinpe: (v: string) => void,
) {
  setPct(String(cfg.pctComisionTarjeta))
  setFijo(String(cfg.montoFijoComisionCrc))
  setSinpe(String(cfg.pctDescuentoSinpe))
}
