import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import QRCode from 'qrcode'
import { authService } from '@/services/authService'
import {
  F, Block, FormGroup, StyledInput, CheckIcon, LockIcon, AlertIcon, KeyIcon, CopyIcon, DownloadIcon, RefreshIcon,
} from './configUi'

function OtpInputs({ accent = 'var(--hc-accent)', code, inputRefs, onDigit, onKeyDown, onPaste }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }} onPaste={onPaste}>
      {code.map((d, i) => (
        <input key={i} ref={el => inputRefs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={d} onChange={e => onDigit(i, e.target.value)} onKeyDown={e => onKeyDown(i, e)}
          style={{ width: '42px', height: '46px', borderRadius: '10px', textAlign: 'center', fontSize: '17px', fontWeight: 700, fontFamily: F.mono, outline: 'none', transition: 'all .15s', background: d ? `color-mix(in srgb, ${accent} 10%, transparent)` : 'var(--hc-bg)', border: `1px solid ${d ? `color-mix(in srgb, ${accent} 35%, transparent)` : 'var(--hc-border)'}`, color: 'var(--hc-text)', boxSizing: 'border-box' }}
        />
      ))}
    </div>
  )
}

export default function Panel2FA({ enabled, loading, toast, onEnabled, onDisabled }) {
  const { t } = useTranslation()
  const [step, setStep]           = useState('idle')
  const [qrData, setQrData]       = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [code, setCode]           = useState(['','','','','',''])
  const [password, setPassword]   = useState('')
  const [working, setWorking]     = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const inputRefs = useRef([])

  const codeStr = code.join('')

  useEffect(() => {
    if (!qrData?.qrUri) return
    QRCode.toDataURL(qrData.qrUri, { width: 160, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null))
  }, [qrData])

  const handleDigit = (i, val) => {
    const digit = val.replace(/\D/g,'').slice(-1)
    const next = [...code]; next[i] = digit; setCode(next)
    if (digit && i < 5) inputRefs.current[i+1]?.focus()
  }
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) { inputRefs.current[i-1]?.focus(); const next=[...code]; next[i-1]=''; setCode(next) }
  }
  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    if (text.length) setCode(text.split('').concat(new Array(6).fill('')).slice(0,6))
  }
  const resetCode = () => setCode(['','','','','',''])

  const startSetup = async () => {
    setWorking(true)
    try {
      const { data } = await authService.setup2FA()
      // api.js auto-unwraps ResponseDTO → data ya es { secret, qrUri }
      const payload = data?.qrUri ? data : data?.data
      if (!payload?.qrUri) throw new Error('Respuesta inválida del servidor')
      setQrData(payload)
      setStep('setup')
      resetCode()
    } catch (err) {
      const msg = err.response?.data?.message ?? err.message ?? t('adminConfig.tfaErrorInit')
      toast({ message: msg, type: 'error' })
    } finally { setWorking(false) }
  }
  const activate = async () => {
    if (codeStr.length !== 6) { toast({ message: t('adminConfig.tfaEnterCode'), type: 'error' }); return }
    setWorking(true)
    try {
      const { data } = await authService.activate2FA(codeStr)
      onEnabled(); setStep('idle'); setQrData(null); setQrDataUrl(null); resetCode(); setCopiedAll(false)
      setRecoveryCodes(data?.recoveryCodes ?? data?.data?.recoveryCodes ?? null)
    } catch (err) { toast({ message: err.response?.data?.message ?? t('adminConfig.tfaWrongCode'), type: 'error' }) }
    finally { setWorking(false) }
  }
  const disable = async () => {
    if (!password || codeStr.length !== 6) { toast({ message: t('adminConfig.tfaFillAll'), type: 'error' }); return }
    setWorking(true)
    try {
      await authService.disable2FA(password, codeStr)
      onDisabled(); setStep('idle'); setPassword(''); resetCode()
      toast({ message: t('adminConfig.tfaDisabledToast'), type: 'success' })
    } catch (err) { toast({ message: err.response?.data?.message ?? t('adminConfig.tfaErrorDisable'), type: 'error' }) }
    finally { setWorking(false) }
  }
  const regenerate = async () => {
    if (codeStr.length !== 6) { toast({ message: t('adminConfig.tfaEnterTotp'), type: 'error' }); return }
    setWorking(true)
    try {
      const { data } = await authService.regenerateRecoveryCodes(codeStr)
      setStep('idle'); resetCode(); setCopiedAll(false)
      setRecoveryCodes(data?.recoveryCodes ?? data?.data?.recoveryCodes ?? null)
      toast({ message: t('adminConfig.tfaCodesRegen'), type: 'success' })
    } catch (err) { toast({ message: err.response?.data?.message ?? t('adminConfig.tfaErrorRegen'), type: 'error' }) }
    finally { setWorking(false) }
  }
  const cancel = () => { setStep('idle'); resetCode(); setPassword(''); setQrData(null); setQrDataUrl(null) }
  const copyAllCodes = () => { navigator.clipboard.writeText(recoveryCodes.join('\n')); setCopiedAll(true); toast({ message: t('adminConfig.tfaCopiedToast'), type: 'success' }) }
  const downloadCodes = () => {
    const blob = new Blob(['HotClick — Códigos de recuperación 2FA\n','========================================\n','Guardá estos códigos en un lugar seguro.\nCada código solo se puede usar una vez.\n\n',recoveryCodes.join('\n'),'\n'],{type:'text/plain'})
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = 'hotclick-recovery-codes.txt'; a.click(); URL.revokeObjectURL(url)
  }



  return (
    <>
      <Block label={t('adminConfig.tfaTitle')} sublabel={t('adminConfig.tfaSubtitle')}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><Spinner /></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Status row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '12px', background: enabled ? 'rgba(34,197,94,0.07)' : 'rgba(245,158,11,0.07)', border: `1px solid ${enabled ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: enabled ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)' }}>
                  {enabled ? <LockIcon style={{ width: '15px', height: '15px', color: '#4ade80' }} /> : <AlertIcon style={{ width: '15px', height: '15px', color: '#fbbf24' }} />}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: enabled ? '#4ade80' : '#fbbf24', fontFamily: F.body, margin: 0 }}>{enabled ? t('adminConfig.tfaEnabledStatus') : t('adminConfig.tfaDisabledStatus')}</p>
                  <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{enabled ? t('adminConfig.tfaProtected') : t('adminConfig.tfaRecommend')}</p>
                </div>
              </div>
              {step === 'idle' && (
                enabled
                  ? <button onClick={() => setStep('disable')} className="cfg-btn cfg-btn-danger" style={{ fontSize: '12px', padding: '7px 14px' }}>{t('adminConfig.tfaDeactivateBtn')}</button>
                  : <button onClick={startSetup} disabled={working} className="cfg-btn cfg-btn-primary" style={{ fontSize: '12px', padding: '7px 14px' }}>{working ? <Spinner size="xs" /> : null}{t('adminConfig.tfaActivateBtn')}</button>
              )}
            </div>

            {enabled && step === 'idle' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'var(--hc-border)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <KeyIcon style={{ width: '15px', height: '15px', color: 'var(--hc-muted)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaRecoveryCodes')}</p>
                    <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{t('adminConfig.tfaRecoveryDesc')}</p>
                  </div>
                </div>
                <button onClick={() => { setStep('regen'); resetCode() }} className="cfg-btn cfg-btn-ghost" style={{ fontSize: '12px', padding: '7px 14px' }}>{t('adminConfig.tfaRegenBtn')}</button>
              </div>
            )}

            {step === 'setup' && qrData && (
              <div style={{ borderRadius: '12px', padding: '16px', background: 'rgba(23,71,168,0.06)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'rgba(23,71,168,0.18)'}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--hc-accent)', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaStep1')}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div style={{ flexShrink: 0, padding: '10px', background: '#fff', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                    {qrDataUrl ? <img src={qrDataUrl} alt="QR 2FA" style={{ width: '144px', height: '144px', display: 'block' }} /> : <div style={{ width: '144px', height: '144px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaStep2Desc')}</p>
                    <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'var(--hc-border)'}` }}>
                      <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--hc-muted)', marginBottom: '6px', margin: '0 0 6px' }}>Clave de configuración</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ fontSize: '12px', color: 'var(--hc-text)', fontFamily: F.mono, letterSpacing: '0.1em', wordBreak: 'break-all', flex: 1 }}>{qrData.secret}</code>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(qrData.secret); toast({ message: t('adminConfig.tfaKeyCopied'), type: 'success' }) }}
                          style={{ flexShrink: 0, padding: '6px', borderRadius: '8px', background: 'var(--hc-surface-2)', border: 'none', cursor: 'pointer', color: 'var(--hc-muted)', display: 'flex' }}>
                          <CopyIcon style={{ width: '13px', height: '13px' }} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--hc-accent)', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
                      <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaStep2Label')}</p>
                    </div>
                  </div>
                </div>
                <OtpInputs accent="var(--hc-accent)" code={code} inputRefs={inputRefs} onDigit={handleDigit} onKeyDown={handleKeyDown} onPaste={handlePaste} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={activate} disabled={codeStr.length !== 6 || working} className="cfg-btn cfg-btn-primary">{working ? <Spinner size="xs" /> : <CheckIcon style={{ width: '14px', height: '14px' }} />}{t('adminConfig.tfaActivateSubmit')}</button>
                  <button onClick={cancel} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaCancel')}</button>
                </div>
              </div>
            )}

            {step === 'disable' && (
              <div style={{ borderRadius: '12px', padding: '16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaDisableTitle')}</p>
                <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaDisableDesc')}</p>
                <FormGroup label={t('adminConfig.tfaCurrentPwd')}>
                  <StyledInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('adminConfig.pwdCurrentPh')} />
                </FormGroup>
                <div>
                  <label className="cfg-label" style={{ display: 'block', marginBottom: '8px' }}>{t('adminConfig.tfaAuthCode')}</label>
                  <OtpInputs accent="#ef4444" code={code} inputRefs={inputRefs} onDigit={handleDigit} onKeyDown={handleKeyDown} onPaste={handlePaste} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={disable} disabled={working || !password || codeStr.length !== 6} className="cfg-btn" style={{ background: '#dc2626', color: '#fff', boxShadow: '0 1px 10px rgba(220,38,38,0.3)', opacity: (working || !password || codeStr.length !== 6) ? 0.4 : 1, cursor: (working || !password || codeStr.length !== 6) ? 'not-allowed' : 'pointer' }}>{working ? <Spinner size="xs" /> : null}{t('adminConfig.tfaDisableSubmit')}</button>
                  <button onClick={cancel} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaCancel')}</button>
                </div>
              </div>
            )}

            {step === 'regen' && (
              <div style={{ borderRadius: '12px', padding: '16px', background: 'rgba(100,144,234,0.06)', border: '1px solid rgba(100,144,234,0.2)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyIcon style={{ width: '14px', height: '14px', color: '#97B7F3' }} />
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaRegenTitle')}</p>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaRegenDesc')}</p>
                <div>
                  <label className="cfg-label" style={{ display: 'block', marginBottom: '8px' }}>{t('adminConfig.tfaAuthCode')}</label>
                  <OtpInputs accent="var(--hc-blue-400)" code={code} inputRefs={inputRefs} onDigit={handleDigit} onKeyDown={handleKeyDown} onPaste={handlePaste} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={regenerate} disabled={working || codeStr.length !== 6} className="cfg-btn" style={{ background: 'var(--hc-accent)', color: '#fff', opacity: (working || codeStr.length !== 6) ? 0.4 : 1, cursor: (working || codeStr.length !== 6) ? 'not-allowed' : 'pointer' }}>{working ? <Spinner size="xs" /> : <RefreshIcon style={{ width: '14px', height: '14px' }} />}{t('adminConfig.tfaRegenSubmit')}</button>
                  <button onClick={cancel} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaCancel')}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Block>

      {/* Recovery codes modal */}
      {recoveryCodes && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
          <div style={{ width: '100%', maxWidth: '440px', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', background: 'var(--hc-surface)', border: '1px solid rgba(100,144,234,0.3)' }}>
            <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(100,144,234,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <KeyIcon style={{ width: '20px', height: '20px', color: '#97B7F3' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--hc-text)', fontFamily: F.display, margin: 0 }}>{t('adminConfig.tfaModalTitle')}</h3>
                <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '4px', lineHeight: 1.5, fontFamily: F.body }}>{t('adminConfig.tfaModalDesc')}</p>
              </div>
            </div>
            <div style={{ margin: '0 24px 16px', padding: '16px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recoveryCodes.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <code style={{ fontSize: '13px', fontFamily: F.mono, letterSpacing: '0.1em', color: 'var(--hc-text)' }}>{c}</code>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>#{i+1}</span>
                </div>
              ))}
            </div>
            <div style={{ margin: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertIcon style={{ width: '14px', height: '14px', color: '#f59e0b', flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: 'rgba(251,191,36,0.9)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaModalWarning')}</p>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: '10px' }}>
              <button onClick={copyAllCodes} className="cfg-btn" style={{ flex: 1, justifyContent: 'center', background: copiedAll ? 'rgba(34,197,94,0.12)' : 'var(--hc-surface-2)', color: copiedAll ? 'var(--hc-success)' : 'var(--hc-text)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'var(--hc-border)'}` }}>
                {copiedAll ? <CheckIcon style={{ width: '14px', height: '14px' }} /> : <CopyIcon style={{ width: '14px', height: '14px' }} />}
                {copiedAll ? t('adminConfig.tfaCopiedAll') : t('adminConfig.tfaCopyAll')}
              </button>
              <button onClick={downloadCodes} className="cfg-btn" style={{ flex: 1, justifyContent: 'center', background: 'rgba(100,144,234,0.08)', color: 'var(--hc-accent)', border: '1px solid rgba(100,144,234,0.2)' }}>
                <DownloadIcon style={{ width: '14px', height: '14px' }} />{t('adminConfig.tfaDownload')}
              </button>
              <button onClick={() => setRecoveryCodes(null)} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaClose')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
