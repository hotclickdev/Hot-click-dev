import { ta, inpStyle as taStyle } from '../nuevo-producto/productFormUi'
import { setField } from './productoFormCampos'

function BadgeConContenido({ visible }) {
  if (!visible) return null
  return <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: 'var(--hc-accent)', backgroundColor: 'rgba(23,71,168,0.08)' }}>✓ con contenido</span>
}

function etiquetaVideo(url) {
  if (!url) return null
  if (/youtube|youtu\.be/.test(url)) return { label: '▶ YouTube', color: '#a8291f', bg: 'rgba(220,38,38,0.08)' }
  if (/tiktok/.test(url)) return { label: '▶ TikTok', color: 'var(--hc-text)', bg: 'var(--hc-surface-2)' }
  if (/instagram/.test(url)) return { label: '▶ Instagram', color: '#be185d', bg: 'rgba(219,39,119,0.08)' }
  return { label: '▶ con video', color: 'var(--hc-muted)', bg: 'var(--hc-surface-2)' }
}

export default function BloqueContenido({ form, setForm }) {
  const video = etiquetaVideo(form.videoUrl)
  return (
    <div className="pt-4 space-y-4" style={{ borderTop: '1px solid var(--hc-border)' }}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Contenido del producto</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: '#1E7F4F', backgroundColor: '#e2f1e8' }}>visible para el cliente</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
          Especificaciones técnicas
          <BadgeConContenido visible={!!form.especificaciones} />
        </label>
        <textarea
          value={form.especificaciones}
          onChange={(e) => setField(setForm, 'especificaciones', e.target.value)}
          rows={5}
          placeholder={"- Marca: Samsung\n- Modelo: Galaxy A54\n- Color: Negro\n- Almacenamiento: 128GB\n- RAM: 6GB"}
          className={`${ta} min-h-[110px] font-mono text-xs`}
          style={taStyle}
        />
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Una línea = un punto. Se muestra como lista al cliente en la ficha del producto.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
          Cómo usar
          <BadgeConContenido visible={!!form.comoUsar} />
        </label>
        <textarea
          value={form.comoUsar}
          onChange={(e) => setField(setForm, 'comoUsar', e.target.value)}
          rows={4}
          placeholder={"1. Cargue el dispositivo completamente antes de usar\n2. Inserte la tarjeta SIM\n3. Encienda con el botón lateral\n4. Siga las instrucciones en pantalla"}
          className={`${ta} min-h-[90px]`}
          style={taStyle}
        />
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Pasos numerados. Ej: "1. Primer paso". Se muestra como lista ordenada al cliente.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--hc-text)' }}>
          <span>Video del producto</span>
          {video && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: video.color, backgroundColor: video.bg }}>{video.label}</span>
          )}
        </label>
        <input
          type="url"
          value={form.videoUrl}
          onChange={(e) => setField(setForm, 'videoUrl', e.target.value)}
          placeholder="YouTube, TikTok o Instagram..."
          className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
          style={taStyle}
        />
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Pega el link de YouTube, TikTok o Instagram. Se mostrará como video embed en la página de detalle.</p>
      </div>
    </div>
  )
}
