import { useState, useEffect, useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import QRCode from 'qrcode'
import { authService } from '@/services/authService'
import { Block, mensajeErrorConfig, mensajeErrorConfigOLocal } from './configUi'
import TfaStatusRow from './tfa/TfaStatusRow'
import TfaSetupStep from './tfa/TfaSetupStep'
import TfaDisableStep from './tfa/TfaDisableStep'
import TfaRegenStep from './tfa/TfaRegenStep'
import TfaRecoveryModal from './tfa/TfaRecoveryModal'

type ToastFn = (opts: { message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => void
type QrPayload = { qrUri?: string; secret?: string; data?: QrPayload; recoveryCodes?: string[] }

export default function Panel2FA({ enabled, loading, toast, onEnabled, onDisabled }: {
  enabled: boolean
  loading: boolean
  toast: ToastFn
  onEnabled: () => void
  onDisabled: () => void
}) {
  const { t } = useTranslation()
  const [step, setStep]           = useState('idle')
  const [qrData, setQrData]       = useState<QrPayload | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [code, setCode]           = useState(['','','','','',''])
  const [password, setPassword]   = useState('')
  const [working, setWorking]     = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const codeStr = code.join('')

  useEffect(() => {
    if (!qrData?.qrUri) return
    QRCode.toDataURL(qrData.qrUri, { width: 160, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null))
  }, [qrData])

  const handleDigit = (i: number, val: string) => {
    const digit = val.replace(/\D/g,'').slice(-1)
    const next = [...code]; next[i] = digit; setCode(next)
    if (digit && i < 5) inputRefs.current[i+1]?.focus()
  }
  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) { inputRefs.current[i-1]?.focus(); const next=[...code]; next[i-1]=''; setCode(next) }
  }
  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    if (text.length) setCode(text.split('').concat(new Array(6).fill('')).slice(0,6))
  }
  const resetCode = () => setCode(['','','','','',''])

  const startSetup = async () => {
    setWorking(true)
    try {
      const { data } = await authService.setup2FA()
      // api.js auto-unwraps ResponseDTO → data ya es { secret, qrUri }
      const payload = (data as QrPayload)?.qrUri ? data as QrPayload : (data as QrPayload)?.data
      if (!payload?.qrUri) throw new Error('Respuesta inválida del servidor')
      setQrData(payload)
      setStep('setup')
      resetCode()
    } catch (err: unknown) {
      const msg = mensajeErrorConfigOLocal(err, t('adminConfig.tfaErrorInit'))
      toast({ message: msg, type: 'error' })
    } finally { setWorking(false) }
  }
  const activate = async () => {
    if (codeStr.length !== 6) { toast({ message: t('adminConfig.tfaEnterCode'), type: 'error' }); return }
    setWorking(true)
    try {
      const { data } = await authService.activate2FA(codeStr)
      onEnabled(); setStep('idle'); setQrData(null); setQrDataUrl(null); resetCode(); setCopiedAll(false)
      setRecoveryCodes((data as QrPayload)?.recoveryCodes ?? (data as QrPayload)?.data?.recoveryCodes ?? null)
    } catch (err: unknown) { toast({ message: mensajeErrorConfig(err, t('adminConfig.tfaWrongCode')), type: 'error' }) }
    finally { setWorking(false) }
  }
  const disable = async () => {
    if (!password || codeStr.length !== 6) { toast({ message: t('adminConfig.tfaFillAll'), type: 'error' }); return }
    setWorking(true)
    try {
      await authService.disable2FA(password, codeStr)
      onDisabled(); setStep('idle'); setPassword(''); resetCode()
      toast({ message: t('adminConfig.tfaDisabledToast'), type: 'success' })
    } catch (err: unknown) { toast({ message: mensajeErrorConfig(err, t('adminConfig.tfaErrorDisable')), type: 'error' }) }
    finally { setWorking(false) }
  }
  const regenerate = async () => {
    if (codeStr.length !== 6) { toast({ message: t('adminConfig.tfaEnterTotp'), type: 'error' }); return }
    setWorking(true)
    try {
      const { data } = await authService.regenerateRecoveryCodes(codeStr)
      setStep('idle'); resetCode(); setCopiedAll(false)
      setRecoveryCodes((data as QrPayload)?.recoveryCodes ?? (data as QrPayload)?.data?.recoveryCodes ?? null)
      toast({ message: t('adminConfig.tfaCodesRegen'), type: 'success' })
    } catch (err: unknown) { toast({ message: mensajeErrorConfig(err, t('adminConfig.tfaErrorRegen')), type: 'error' }) }
    finally { setWorking(false) }
  }
  const cancel = () => { setStep('idle'); resetCode(); setPassword(''); setQrData(null); setQrDataUrl(null) }
  const copyAllCodes = () => { navigator.clipboard.writeText(recoveryCodes!.join('\n')); setCopiedAll(true); toast({ message: t('adminConfig.tfaCopiedToast'), type: 'success' }) }
  const downloadCodes = () => {
    const blob = new Blob(['HotClick — Códigos de recuperación 2FA\n','========================================\n','Guardá estos códigos en un lugar seguro.\nCada código solo se puede usar una vez.\n\n',recoveryCodes!.join('\n'),'\n'],{type:'text/plain'})
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = 'hotclick-recovery-codes.txt'; a.click(); URL.revokeObjectURL(url)
  }

  const otpProps = { code, inputRefs, onDigit: handleDigit, onKeyDown: handleKeyDown, onPaste: handlePaste }

  return (
    <>
      <Block label={t('adminConfig.tfaTitle')} sublabel={t('adminConfig.tfaSubtitle')}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><Spinner /></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <TfaStatusRow
              t={t} enabled={enabled} step={step} working={working} copiedAll={copiedAll}
              onDisable={() => setStep('disable')} onStartSetup={startSetup}
              onRegen={() => { setStep('regen'); resetCode() }}
            />

            {step === 'setup' && qrData && (
              <TfaSetupStep
                t={t} qrData={qrData} qrDataUrl={qrDataUrl} copiedAll={copiedAll}
                codeStr={codeStr} working={working} {...otpProps}
                onCopySecret={() => { navigator.clipboard.writeText(qrData.secret as string); toast({ message: t('adminConfig.tfaKeyCopied'), type: 'success' }) }}
                onActivate={activate} onCancel={cancel}
              />
            )}

            {step === 'disable' && (
              <TfaDisableStep
                t={t} password={password} setPassword={setPassword}
                codeStr={codeStr} working={working} {...otpProps}
                onDisable={disable} onCancel={cancel}
              />
            )}

            {step === 'regen' && (
              <TfaRegenStep
                t={t} codeStr={codeStr} working={working} {...otpProps}
                onRegenerate={regenerate} onCancel={cancel}
              />
            )}
          </div>
        )}
      </Block>

      {/* Recovery codes modal */}
      {recoveryCodes && (
        <TfaRecoveryModal
          t={t} recoveryCodes={recoveryCodes} copiedAll={copiedAll}
          onCopyAll={copyAllCodes} onDownload={downloadCodes}
          onClose={() => setRecoveryCodes(null)}
        />
      )}
    </>
  )
}
