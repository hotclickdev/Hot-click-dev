import { Link } from 'react-router-dom'
import Spinner from '@/components/ui/Spinner'
import { CARD_SHADOW } from './sistemaProductosHelpers'
import { useSistemaProductoForm } from './useSistemaProductoForm'
import SistemaProductoCreado from './SistemaProductoCreado'
import TextoFlecha from '@/components/ui/TextoFlecha'

const inputClass = 'px-3.5 py-3 rounded-[10px] text-[15px] focus:outline-none w-full'
const inputStyle = { border: '1px solid #d8cfc0', color: 'var(--hc-text)', backgroundColor: 'var(--hc-surface)' }

/**
 * Alta/edición de producto para el dueño. Mockup Sistema - Nuevo producto.
 */
export default function SistemaProductoForm() {
  const f = useSistemaProductoForm()

  if (f.loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  }

  if (f.creado) {
    return (
      <SistemaProductoCreado
        producto={f.creado}
        slug={f.slug}
        tiendaPublica={f.creado.tiendaPublica}
        onOtro={f.agregarOtro}
      />
    )
  }

  return (
    <form onSubmit={f.guardar} className="flex flex-col min-h-[70vh]">
      <div className="max-w-[760px] pb-28">
        <header className="flex flex-col gap-1.5 mb-6">
          <Link to="/admin/productos" className="text-sm font-semibold" style={{ color: 'var(--hc-accent)' }}>
            <TextoFlecha dir="atras">Volvé a Productos</TextoFlecha>
          </Link>
          <h1 className="text-[26px] font-bold tracking-tight m-0" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>
            {f.editing ? 'Editá el producto' : 'Agregá un producto'}
          </h1>
          <p className="text-[15px] m-0" style={{ color: '#6b6459' }}>
            Solo el nombre y el precio son obligatorios. Lo demás lo podés completar después.
          </p>
        </header>

        <BloqueDatos form={f.form} setCampo={f.setCampo} categories={f.categories} />
        <BloquePrecio form={f.form} setCampo={f.setCampo} />
        <BloqueFoto form={f.form} subiendo={f.subiendo} onFile={f.subirFoto} />
      </div>

      <footer
        className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-10 py-4 flex items-center justify-end gap-5"
        style={{ backgroundColor: 'var(--hc-surface)', borderTop: '1px solid #e3dacb' }}
      >
        <Link to="/admin/productos" className="text-[15px] font-semibold" style={{ color: '#6b6459' }}>Cancelá</Link>
        <button
          type="submit"
          disabled={f.saving}
          className="inline-flex items-center justify-center px-[26px] py-[13px] rounded-[10px] text-[15px] font-bold disabled:opacity-50"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          {f.saving ? 'Guardando…' : 'Guardá el producto'}
        </button>
      </footer>
    </form>
  )
}

function BloqueDatos({ form, setCampo, categories }) {
  return (
    <section className="rounded-2xl p-6 flex flex-col gap-[18px] mb-4" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
      <h2 className="m-0 text-[17px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>Datos del producto</h2>
      <Campo label="Nombre">
        <input value={form.nombre} onChange={setCampo('nombre')} placeholder="Ej: Café molido 500 g" required className={inputClass} style={inputStyle} />
      </Campo>
      <Campo label="Categoría">
        <select value={form.categoriaId} onChange={setCampo('categoriaId')} className={inputClass} style={inputStyle}>
          <option value="">Elegí una categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.nombreCategoria ?? c.nombre}</option>
          ))}
        </select>
      </Campo>
      <Campo label="Descripción" opcional>
        <textarea value={form.descripcion} onChange={setCampo('descripcion')} rows={3} placeholder="Contale a tus clientes qué hace especial a este producto." className={`${inputClass} resize-y`} style={inputStyle} />
      </Campo>
    </section>
  )
}

function BloquePrecio({ form, setCampo }) {
  return (
    <section className="rounded-2xl p-6 flex flex-col gap-[18px] mb-4" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
      <h2 className="m-0 text-[17px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>Precio y stock</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Precio de venta" hint="Con IVA incluido.">
          <div className="flex items-center overflow-hidden rounded-[10px]" style={{ border: '1px solid #d8cfc0' }}>
            <span className="pl-3.5 font-bold" style={{ fontFamily: 'var(--font-display)', color: '#8a8378' }}>₡</span>
            <input type="number" min="0" value={form.precioVenta} onChange={setCampo('precioVenta')} placeholder="0" className="flex-1 px-2 py-3 font-bold text-[15px] focus:outline-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }} />
          </div>
        </Campo>
        <Campo label="Cantidad en stock" hint="Te avisamos cuando quede poco.">
          <input type="number" min="0" value={form.stock} onChange={setCampo('stock')} placeholder="0" className={inputClass} style={inputStyle} />
        </Campo>
      </div>
      <div className="max-w-xs">
        <Campo label="Código / SKU" opcional>
          <input value={form.sku} onChange={setCampo('sku')} placeholder="Ej: CAF-500" className={inputClass} style={inputStyle} />
        </Campo>
      </div>
    </section>
  )
}

function BloqueFoto({ form, subiendo, onFile }) {
  return (
    <section className="rounded-2xl p-6 flex flex-col gap-3.5" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
      <h2 className="m-0 text-[17px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>
        Foto <span className="font-normal text-sm" style={{ fontFamily: 'var(--font-sans)', color: '#8a8378' }}>(opcional, pero vende más)</span>
      </h2>
      {form.imagenUrl ? (
        <div className="flex items-center gap-4">
          <img src={form.imagenUrl} alt="" className="w-20 h-20 rounded-xl object-cover" />
          <label className="text-sm font-semibold cursor-pointer" style={{ color: 'var(--hc-accent)' }}>
            Cambiá la foto
            <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </div>
      ) : (
        <label className="rounded-xl px-8 py-8 flex flex-col items-center gap-2 text-center cursor-pointer" style={{ border: '2px dashed #d8cfc0', backgroundColor: '#faf6ef' }}>
          <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="w-12 h-12 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }} />
          <div className="text-[15px] font-semibold">{subiendo ? 'Subiendo…' : 'Arrastrá una foto aquí'}</div>
          <div className="text-sm" style={{ color: '#8a8378' }}>o buscala en tu compu · JPG o PNG, máx. 5 MB</div>
        </label>
      )}
    </section>
  )
}

function Campo({ label, opcional, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
        {label}
        {opcional && <span className="font-normal" style={{ color: '#8a8378' }}> (opcional)</span>}
      </label>
      {children}
      {hint && <span className="text-[13px]" style={{ color: '#8a8378' }}>{hint}</span>}
    </div>
  )
}
