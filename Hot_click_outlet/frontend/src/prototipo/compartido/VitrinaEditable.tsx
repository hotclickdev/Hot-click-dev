import type { ChangeEvent } from 'react'
import { useVitrinaEditable, type Vitrina } from './useVitrinaEditable'

const CLASE_CAMPO = 'w-full rounded-xl border border-hc-border bg-hc-surface px-3.5 py-3 text-sm text-hc-text outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hc-primary'
const CLASE_BOTON = 'inline-flex min-h-11 items-center rounded-full bg-white/90 px-4 text-xs font-semibold text-hc-n-900'

/**
 * Portada, logo y textos de la vitrina. Lo que se guarda es lo que ve el comprador.
 */
export default function VitrinaEditable() {
  const vitrina = useVitrinaEditable()
  if (vitrina.errorCarga) return <p className="px-5 py-4 text-sm text-hc-danger" role="alert">{vitrina.errorCarga}</p>
  if (!vitrina.vitrina) return <p className="px-5 py-4 text-sm text-hc-muted">Cargando tu tienda…</p>
  return (
    <Editor
      datos={vitrina.vitrina}
      subiendo={vitrina.subiendo}
      guardando={vitrina.guardando}
      onCambiar={vitrina.cambiar}
      onGuardar={vitrina.guardarTextos}
      onSubir={vitrina.subirImagen}
      onQuitarPortada={vitrina.quitarPortada}
    />
  )
}

type EditorProps = {
  datos: Vitrina
  subiendo: '' | 'logo' | 'portada'
  guardando: boolean
  onCambiar: (campo: 'nombre' | 'tagline' | 'descripcion', valor: string) => void
  onGuardar: () => void
  onSubir: (tipo: 'logo' | 'portada', file?: File) => void
  onQuitarPortada: () => void
}

function Editor({ datos, subiendo, guardando, onCambiar, onGuardar, onSubir, onQuitarPortada }: EditorProps) {
  return (
    <div>
      <Portada datos={datos} subiendo={subiendo === 'portada'} onSubir={(file) => onSubir('portada', file)} onQuitar={onQuitarPortada} />
      <div className="flex flex-col gap-3 px-5 pt-2">
        <Logo datos={datos} subiendo={subiendo === 'logo'} onSubir={(file) => onSubir('logo', file)} />
        <CampoTexto id="vitrina-nombre" etiqueta="Nombre de la tienda" value={datos.nombre} onChange={(valor) => onCambiar('nombre', valor)} />
        <CampoTexto id="vitrina-frase" etiqueta="Frase corta" value={datos.tagline} onChange={(valor) => onCambiar('tagline', valor)} placeholder="Ej: Outlet oficial" />
        <label className="flex flex-col gap-1.5 text-xs font-medium text-hc-muted" htmlFor="vitrina-descripcion">
          Texto de la tienda
          <textarea id="vitrina-descripcion" value={datos.descripcion} rows={4} onChange={(e) => onCambiar('descripcion', e.target.value)} className={CLASE_CAMPO} />
        </label>
        <button type="button" onClick={onGuardar} disabled={guardando} className="inline-flex min-h-12 items-center justify-center rounded-full bg-hc-primary px-5 text-sm font-semibold text-white disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar textos'}
        </button>
      </div>
    </div>
  )
}

function Portada({ datos, subiendo, onSubir, onQuitar }: { datos: Vitrina; subiendo: boolean; onSubir: (file?: File) => void; onQuitar: () => void }) {
  return (
    <div className="relative h-36 overflow-hidden bg-hc-primary">
      {datos.portadaUrl ? <img src={datos.portadaUrl} alt="" className="size-full object-cover" /> : null}
      <div className="absolute inset-x-3 bottom-3 flex gap-2">
        <BotonArchivo etiqueta={subiendo ? 'Subiendo…' : 'Cambiar portada'} disabled={subiendo} onArchivo={onSubir} />
        {datos.portadaUrl ? (
          <button type="button" onClick={onQuitar} className={CLASE_BOTON}>Quitar portada</button>
        ) : null}
      </div>
    </div>
  )
}

function Logo({ datos, subiendo, onSubir }: { datos: Vitrina; subiendo: boolean; onSubir: (file?: File) => void }) {
  return (
    <div className="-mt-10 flex items-end gap-3">
      <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-hc-surface text-2xl font-bold text-hc-primary">
        {datos.logoUrl ? <img src={datos.logoUrl} alt="" className="size-full object-cover" /> : datos.inicial}
      </div>
      <BotonArchivo etiqueta={subiendo ? 'Subiendo…' : 'Cambiar logo'} disabled={subiendo} onArchivo={onSubir} oscuro />
    </div>
  )
}

function BotonArchivo({ etiqueta, disabled, onArchivo, oscuro = false }: { etiqueta: string; disabled: boolean; onArchivo: (file?: File) => void; oscuro?: boolean }) {
  function elegir(e: ChangeEvent<HTMLInputElement>) {
    onArchivo(e.target.files?.[0])
    e.target.value = ''
  }
  return (
    <label className={`${oscuro ? 'inline-flex min-h-11 items-center rounded-full border border-hc-border bg-hc-surface px-4 text-xs font-semibold text-hc-text' : CLASE_BOTON} ${disabled ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}>
      {etiqueta}
      <input type="file" accept="image/*" className="sr-only" disabled={disabled} onChange={elegir} />
    </label>
  )
}

function CampoTexto({ id, etiqueta, value, onChange, placeholder }: { id: string; etiqueta: string; value: string; onChange: (valor: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-hc-muted" htmlFor={id}>
      {etiqueta}
      <input id={id} value={value} maxLength={200} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={CLASE_CAMPO} />
    </label>
  )
}
