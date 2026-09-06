import { toSlug } from './toSlug'
import { inp, ta, inpStyle } from './productFormUi'
import CharCounter from './CharCounter'
import { SEO_LANGS } from './wizardHelpers'
import TextoCamino from '@/components/ui/TextoCamino'
import type { Dispatch, SetStateAction } from 'react'
import type { SeoAutoFlags, SeoLangCode, WizardForm } from './wizardHelpers'

function actualizarTituloSeo(seoLang: SeoLangCode, isEs: boolean, val: string) {
  return (p: WizardForm): WizardForm => ({
    ...p,
    metaTitle: isEs ? val : p.metaTitle,
    seoByLang: { ...p.seoByLang, [seoLang]: { ...p.seoByLang[seoLang], title: val } },
  })
}

function actualizarDescSeo(seoLang: SeoLangCode, isEs: boolean, val: string) {
  return (p: WizardForm): WizardForm => ({
    ...p,
    metaDescription: isEs ? val : p.metaDescription,
    seoByLang: { ...p.seoByLang, [seoLang]: { ...p.seoByLang[seoLang], description: val } },
  })
}

export default function PasoSeo({ form, setForm, seoLang, setSeoLang, seoAuto, setSeoAuto }: {
  form: WizardForm
  setForm: Dispatch<SetStateAction<WizardForm>>
  seoLang: SeoLangCode
  setSeoLang: Dispatch<SetStateAction<SeoLangCode>>
  seoAuto: SeoAutoFlags
  setSeoAuto: Dispatch<SetStateAction<SeoAutoFlags>>
}) {
  const langMeta = SEO_LANGS.find(l => l.code === seoLang)
  const currentSeo = form.seoByLang[seoLang] ?? { title: '', description: '' }
  const isEs = seoLang === 'es'

  const handleTitleChange = (val: string) => {
    setSeoAuto(prev => ({ ...prev, [seoLang]: false }))
    setForm(actualizarTituloSeo(seoLang, isEs, val))
  }
  const handleDescChange = (val: string) => {
    setSeoAuto(prev => ({ ...prev, [seoLang]: false }))
    setForm(actualizarDescSeo(seoLang, isEs, val))
  }

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Google mostrará el contenido según el país del visitante.</p>
      <div className="flex gap-1.5 flex-wrap" role="tablist">
        {SEO_LANGS.map(l => {
          const filled = !!(form.seoByLang[l.code]?.title)
          const active = seoLang === l.code
          return (
            <button key={l.code} type="button" role="tab" aria-selected={active} onClick={() => setSeoLang(l.code)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
              style={active
                ? { backgroundColor: 'rgba(23,71,168,0.12)', borderColor: 'rgba(23,71,168,0.4)', color: 'var(--hc-accent)' }
                : { backgroundColor: 'var(--hc-surface-2)', borderColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}>
              <span>{l.label}</span>
              {filled && !active && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#1E7F4F' }} />}
            </button>
          )
        })}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Título SEO</label>
            {seoAuto[seoLang] && <span className="text-[10px]" style={{ color: 'var(--hc-accent)' }}>auto</span>}
          </div>
          <CharCounter current={currentSeo.title.length} max={60} min={30} />
        </div>
        <input className={inp} style={inpStyle} value={currentSeo.title} maxLength={60}
          placeholder={isEs ? 'Nombre del producto | HotClick Outlet' : 'Product name | HotClick Outlet'}
          onChange={e => handleTitleChange(e.target.value)} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Meta Descripción</label>
            {seoAuto[seoLang] && <span className="text-[10px]" style={{ color: 'var(--hc-accent)' }}>auto</span>}
          </div>
          <CharCounter current={currentSeo.description.length} max={160} min={120} />
        </div>
        <textarea className={ta} style={inpStyle} rows={3} value={currentSeo.description} maxLength={160}
          placeholder={isEs ? 'Descripción | Precio: ₡X | Envíos a todo Costa Rica' : 'Description | Free shipping'}
          onChange={e => handleDescChange(e.target.value)} />
      </div>
      {form.nombre && (
        <div>
          <p className="text-xs mb-1.5" style={{ color: 'var(--hc-muted)' }}>URL generada</p>
          <p className="text-xs rounded-xl px-3 py-2 font-mono truncate" style={{ color: 'var(--hc-accent)', backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
            hotclick.com/productos/{toSlug(form.nombre) || '…'}
          </p>
        </div>
      )}
      <div>
        <p className="text-xs mb-1.5" style={{ color: 'var(--hc-muted)' }}>Vista previa Google · {langMeta?.label} {langMeta?.name}</p>
        <div className="rounded-xl bg-white hc-papel-blanco px-4 py-3 space-y-0.5">
          <p className="text-xs text-green-700 truncate">
            <TextoCamino
              partes={['hotclick.com', 'productos', form.nombre ? toSlug(form.nombre) : '…']}
              iconClassName="w-3 h-3 shrink-0"
            />
          </p>
          <p className="text-base text-blue-700 truncate leading-snug">{currentSeo.title || `Título SEO en ${langMeta?.name}`}</p>
          <p className="text-sm text-[#4d5156] line-clamp-2 leading-snug">{currentSeo.description || 'La meta descripción aparecerá aquí…'}</p>
        </div>
      </div>
    </div>
  )
}
