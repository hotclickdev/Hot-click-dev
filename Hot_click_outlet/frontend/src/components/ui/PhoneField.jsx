import { PhoneInput, defaultCountries, parseCountry } from 'react-international-phone'
import 'react-international-phone/style.css'

const ORDERED_ISO2 = [
  'us','ca',  // +1
  'ru',       // +7
  'eg',       // +20
  'za',       // +27
  'gr',       // +30
  'nl',       // +31
  'be',       // +32
  'fr',       // +33
  'es',       // +34
  'hu',       // +36
  'it',       // +39
  'ro',       // +40
  'ch',       // +41
  'at',       // +43
  'gb',       // +44
  'dk',       // +45
  'se',       // +46
  'no',       // +47
  'pl',       // +48
  'de',       // +49
  'pe',       // +51
  'mx',       // +52
  'cu',       // +53
  'ar',       // +54
  'br',       // +55
  'cl',       // +56
  'co',       // +57
  've',       // +58
  'my',       // +60
  'au',       // +61
  'id',       // +62
  'ph',       // +63
  'nz',       // +64
  'sg',       // +65
  'th',       // +66
  'jp',       // +81
  'kr',       // +82
  'vn',       // +84
  'cn',       // +86
  'tr',       // +90
  'in',       // +91
  'pk',       // +92
  'af',       // +93
  'lk',       // +94
  'mm',       // +95
  'ir',       // +98
  'ma',       // +212
  'dz',       // +213
  'tn',       // +216
  'ly',       // +218
  'gm',       // +220
  'sn',       // +221
  'ml',       // +223
  'ci',       // +225
  'ne',       // +227
  'bj',       // +229
  'mu',       // +230
  'lr',       // +231
  'sl',       // +232
  'gh',       // +233
  'ng',       // +234
  'cf',       // +236
  'cm',       // +237
  'cv',       // +238
  'st',       // +239
  'gq',       // +240
  'ga',       // +241
  'cg',       // +242
  'cd',       // +243
  'ao',       // +244
  'et',       // +251
  'ke',       // +254
  'tz',       // +255
  'ug',       // +256
  'zm',       // +260
  'zw',       // +263
  'pt',       // +351
  'lu',       // +352
  'ie',       // +353
  'is',       // +354
  'al',       // +355
  'mt',       // +356
  'cy',       // +357
  'fi',       // +358
  'bg',       // +359
  'ee',       // +372
  'md',       // +373
  'am',       // +374
  'by',       // +375
  'ad',       // +376
  'mc',       // +377
  'ua',       // +380
  'hr',       // +385
  'si',       // +386
  'ba',       // +387
  'cz',       // +420
  'sk',       // +421
  'gt',       // +502
  'sv',       // +503
  'hn',       // +504
  'ni',       // +505
  'cr',       // +506
  'pa',       // +507
  'ht',       // +509
  'bo',       // +591
  'gy',       // +592
  'ec',       // +593
  'gf',       // +594
  'py',       // +595
  'sr',       // +597
  'uy',       // +598
]

const iso2Map = Object.fromEntries(defaultCountries.map(c => [parseCountry(c).iso2, c]))
const COUNTRIES = ORDERED_ISO2.map(iso2 => iso2Map[iso2]).filter(Boolean)

function emojiFlag(iso2) {
  if (!iso2) return '🌐'
  return String.fromCodePoint(
    ...iso2.toUpperCase().split('').map(c => 0x1F1A5 + c.charCodeAt(0))
  )
}

function FlagEmoji({ iso2 }) {
  return (
    <span style={{ fontSize: 18, lineHeight: 1, userSelect: 'none' }}>
      {emojiFlag(iso2)}
    </span>
  )
}

export default function PhoneField({
  label,
  value,
  onChange,
  required = false,
  hint,
  error,
  defaultCountry = 'cr',
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
            {label}
            {required && <span className="ml-1" style={{ color: 'var(--hc-accent)' }}>*</span>}
          </label>
          {hint && <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{hint}</span>}
        </div>
      )}

      <PhoneInput
        defaultCountry={defaultCountry}
        countries={COUNTRIES}
        value={value}
        onChange={onChange}
        FlagComponent={FlagEmoji}
        inputStyle={{
          backgroundColor: 'var(--hc-surface-2)',
          border: `1.5px solid ${error ? '#ef4444' : 'var(--hc-border)'}`,
          borderLeft: 'none',
          color: 'var(--hc-text)',
          borderRadius: '0 10px 10px 0',
          outline: 'none',
          fontSize: 14,
          padding: '10px 14px',
          height: 44,
          flex: '1 1 0',
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
        }}
        countrySelectorStyleProps={{
          buttonStyle: {
            backgroundColor: 'var(--hc-surface-2)',
            border: `1.5px solid ${error ? '#ef4444' : 'var(--hc-border)'}`,
            borderRight: 'none',
            borderRadius: '10px 0 0 10px',
            paddingLeft: 10,
            paddingRight: 8,
            height: 44,
            flexShrink: 0,
          },
        }}
        style={{ display: 'flex', width: '100%', alignItems: 'stretch' }}
      />

      {error && (
        <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
      )}
    </div>
  )
}
