export function StripeIcon({ selected }) {
  return (
    <svg viewBox="0 0 32 16" className={`w-8 h-5 ${selected ? 'opacity-100' : 'opacity-60'}`} fill="none">
      <text x="0" y="13" fontSize="11" fontWeight="800" fontFamily="sans-serif" fill="#6772e5">stripe</text>
    </svg>
  )
}

export function CardIcon({ selected }) {
  return (
    <svg className={`w-8 h-5 ${selected ? 'opacity-100' : 'opacity-50'}`} viewBox="0 0 32 20" fill="none">
      <rect width="32" height="20" rx="3" fill="#1E242E" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
      <rect y="4" width="32" height="4" fill="rgba(255,255,255,0.15)" />
      <rect x="4" y="12" width="10" height="3" rx="1" fill="rgba(255,255,255,0.4)" />
    </svg>
  )
}

export function LockIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

export function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

export function EfectivoIcon({ selected }) {
  return (
    <svg className={`w-7 h-5 ${selected ? 'opacity-100' : 'opacity-70'}`} viewBox="0 0 36 20" fill="none">
      <rect width="36" height="20" rx="4" fill={selected ? '#78350f' : '#451a03'} />
      <rect x="2" y="5" width="32" height="10" rx="2" fill={selected ? '#d97706' : '#92400e'} opacity="0.5" />
      <circle cx="18" cy="10" r="3.5" stroke={selected ? '#fbbf24' : '#d97706'} strokeWidth="1.2" />
      <text x="4" y="8" fontSize="5" fontWeight="800" fontFamily="sans-serif" fill={selected ? '#fbbf24' : '#d97706'}>₡</text>
    </svg>
  )
}

export function SinpeIcon({ selected }) {
  return (
    <svg className={`w-7 h-5 ${selected ? 'opacity-100' : 'opacity-70'}`} viewBox="0 0 36 20" fill="none">
      <rect width="36" height="20" rx="4" fill={selected ? '#065f46' : '#064e3b'} />
      <text x="4" y="14" fontSize="9" fontWeight="800" fontFamily="sans-serif" fill="#34d399">SINPE</text>
      <rect x="26" y="5" width="7" height="10" rx="1.5" fill="#34d399" opacity="0.8" />
      <rect x="27.5" y="3.5" width="4" height="1.5" rx="0.75" fill="#34d399" opacity="0.5" />
    </svg>
  )
}

export function GlobeIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
    </svg>
  )
}


