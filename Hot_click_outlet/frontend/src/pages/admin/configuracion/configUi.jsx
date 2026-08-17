import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'

/* eslint-disable react-refresh/only-export-components -- helpers + iconos compartidos */

export const NOTIF_KEY = 'hotclick-notif-prefs'
export const STORE_KEY = 'hotclick-store-config'
export const defaultNotifPrefs = {
  emailPedidos: true,
  emailGuia: true,
  emailFallido: true,
  sonidoNuevoPedido: false,
}

export const F = {
  display: 'var(--hc-font-display)',
  body: 'var(--hc-font-text)',
  mono: '"JetBrains Mono","Fira Mono",monospace',
}

export function date() { return new Date().toISOString().split('T')[0] }

export function SectionHeader({ title, desc }) {
  return (
    <div style={{ paddingBottom: '4px' }}>
      <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: '17px', color: 'var(--hc-text)', letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
      {desc && <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '4px', fontFamily: F.body }}>{desc}</p>}
    </div>
  )
}

export function Block({ label, sublabel, children }) {
  return (
    <div className="cfg-card">
      {label && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--hc-border)' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{label}</p>
          {sublabel && <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{sublabel}</p>}
        </div>
      )}
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

export function FormGroup({ label, hint, fieldId, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label htmlFor={fieldId} className="cfg-label">{label}</label>
        {hint && <span style={{ fontSize: '10px', color: 'var(--hc-muted)', fontFamily: F.body, opacity: 0.7 }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function StyledInput({ error, style, ...props }) {
  return (
    <input
      className="cfg-input"
      data-error={error ? 'true' : undefined}
      style={{ ...style }}
      {...props}
    />
  )
}

export function PasswordInput({ show, onToggle, error, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <StyledInput type={show ? 'text' : 'password'} error={error} style={{ paddingRight: '44px' }} {...props} />
      <button type="button" onClick={onToggle} tabIndex={-1}
        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--hc-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'flex', transition: 'color .15s' }}
        onMouseEnter={e => e.currentTarget.style.color='var(--hc-text)'}
        onMouseLeave={e => e.currentTarget.style.color='var(--hc-muted)'}>
        {show ? <EyeOffIcon style={{ width: '15px', height: '15px' }} /> : <EyeIcon style={{ width: '15px', height: '15px' }} />}
      </button>
    </div>
  )
}

export function Toggle({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange}
      className="cfg-toggle"
      style={{ background: checked ? 'var(--hc-accent)' : 'var(--hc-border-strong)', boxShadow: checked ? '0 0 12px var(--hc-shadow)' : 'none' }}>
      <span className="cfg-toggle-knob" style={{ left: checked ? '23px' : '3px' }} />
    </button>
  )
}

export function SaveButton({ saving, saved, label }) {
  const { t } = useTranslation()
  return (
    <button type="submit" disabled={saving || saved}
      className={`cfg-btn ${saved ? 'cfg-btn-success' : 'cfg-btn-primary'}`}
      style={{ opacity: (saving || saved) ? 0.8 : 1 }}>
      {saving ? <Spinner size="xs" /> : saved ? <CheckIcon style={{ width: '14px', height: '14px' }} /> : null}
      {saved ? t('adminConfig.savedLabel') : (label ?? t('adminConfig.saveBtn'))}
    </button>
  )
}

export function LoadingSkeleton({ rows = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: '44px', borderRadius: '10px', background: 'var(--hc-surface-2)', opacity: 1 - i * 0.15, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}

export function passwordStrength(pw, t) {
  if (!pw) return { score: 0, label: '', color: 'var(--hc-muted)' }
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++
  const labels = [t('adminConfig.pwdStrengthWeak'),t('adminConfig.pwdStrengthFair'),t('adminConfig.pwdStrengthGood'),t('adminConfig.pwdStrengthStrong')]
  const colors = ['#ef4444','#f59e0b','#3b82f6','#22c55e']
  return { score: s, label: labels[s-1] ?? labels[0], color: colors[s-1] ?? '#ef4444' }
}

const sv = { fill:'none', stroke:'currentColor', strokeWidth:1.8, strokeLinecap:'round', strokeLinejoin:'round' }
export function UserIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> }
export function ShieldIcon(p)    { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M12 2l8 4v5c0 5-3.5 9.7-8 11C7.5 20.7 4 16 4 11V6l8-4z"/></svg> }
export function BellIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> }
export function PaletteIcon(p)   { return <svg viewBox="0 0 24 24" {...sv} {...p}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg> }
export function CogIcon(p)       { return <svg viewBox="0 0 24 24" {...sv} {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> }
export function MailIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
export function LockIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> }
export function AlertIcon(p)     { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
export function CheckIcon(p)     { return <svg viewBox="0 0 24 24" {...sv} {...p}><polyline points="20 6 9 17 4 12"/></svg> }
export function CopyIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> }
export function EyeIcon(p)       { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
export function EyeOffIcon(p)    { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> }
export function RefreshIcon(p)   { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> }
export function TrashLiteIcon(p) { return <svg viewBox="0 0 24 24" {...sv} {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg> }
export function RestoreIcon(p)   { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> }
export function DBIcon(p)        { return <svg viewBox="0 0 24 24" {...sv} {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> }
export function ServerIcon(p)    { return <svg viewBox="0 0 24 24" {...sv} {...p}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg> }
export function CardIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> }
export function ShoppingIcon(p)  { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> }
export function TruckIcon(p)     { return <svg viewBox="0 0 24 24" {...sv} {...p}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> }
export function SkullIcon(p)     { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M12 2a9 9 0 00-9 9c0 3.07 1.54 5.78 3.9 7.43V21h10v-2.57A9 9 0 0012 2z"/><line x1="9" y1="17" x2="9" y2="21"/><line x1="15" y1="17" x2="15" y2="21"/><circle cx="9" cy="10" r="1.5" fill="currentColor" strokeWidth="0"/><circle cx="15" cy="10" r="1.5" fill="currentColor" strokeWidth="0"/></svg> }
export function KeyIcon(p)       { return <svg viewBox="0 0 24 24" {...sv} {...p}><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg> }
export function SendIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> }
export function DownloadIcon(p)  { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
export function StoreIcon(p)     { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M3 9l1-6h16l1 6"/><path d="M3 9a2 2 0 002 2 2 2 0 002-2 2 2 0 002 2 2 2 0 002-2 2 2 0 002 2 2 2 0 002-2"/><path d="M5 21V11a2 2 0 012-2h10a2 2 0 012 2v10"/><line x1="9" y1="21" x2="9" y2="15"/><line x1="15" y1="21" x2="15" y2="15"/></svg> }
export function DatabaseIcon(p)  { return <svg viewBox="0 0 24 24" {...sv} {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> }
export function PinIcon(p)       { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> }
export function ClockIcon(p)     { return <svg viewBox="0 0 24 24" {...sv} {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
export function PercentIcon(p)   { return <svg viewBox="0 0 24 24" {...sv} {...p}><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg> }
export function ZapIcon(p)       { return <svg viewBox="0 0 24 24" {...sv} {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> }
export function BoxIcon(p)       { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> }
