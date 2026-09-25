/** Preview flotante del panel PYME junto al hero: stats + lista de productos. */
export default function PymeHeroPanel() {
  return (
    <div
      className="w-full max-w-[460px] rounded-2xl border overflow-hidden shadow-[0px_16px_36px_0px_rgba(10,20,46,0.14)] shrink-0"
      style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
    >
      <div className="flex gap-1.5 px-4 py-3" style={{ backgroundColor: 'var(--hc-n-100, #f1f3f6)' }}>
        <span className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: 'var(--hc-primary)' }} />
        <span className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: 'var(--hc-border)' }} />
        <span className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: 'var(--hc-border)' }} />
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex gap-2.5">
          <div className="flex-1 rounded-[10px] px-3.5 py-3" style={{ backgroundColor: 'var(--hc-n-100, #f1f3f6)' }}>
            <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>210</p>
            <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>productos</p>
          </div>
          <div className="flex-1 rounded-[10px] px-3.5 py-3" style={{ backgroundColor: 'var(--hc-n-100, #f1f3f6)' }}>
            <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>4/5</p>
            <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>usuarios</p>
          </div>
          <div className="flex-1 rounded-[10px] px-3.5 py-3" style={{ backgroundColor: 'var(--hc-n-100, #f1f3f6)' }}>
            <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>2</p>
            <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>bodegas</p>
          </div>
        </div>

        {[
          { nombre: 'Camiseta básica', detalle: 'Ropa · 40 unid.', precio: '₡8.900' },
          { nombre: 'Termo 1L', detalle: 'Hogar · 15 unid.', precio: '₡6.500' },
          { nombre: 'Set de oficina', detalle: 'Accesorios · 22 unid.', precio: '₡14.200' },
        ].map((item, i) => (
          <div key={item.nombre}>
            {i > 0 ? <div className="h-px mb-4 -mt-1" style={{ backgroundColor: 'var(--hc-border)' }} /> : null}
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-[10px] shrink-0" style={{ backgroundColor: 'var(--hc-n-100, #f1f3f6)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{item.nombre}</p>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{item.detalle}</p>
              </div>
              <p className="text-[13px] shrink-0" style={{ color: 'var(--hc-primary)', fontFamily: 'var(--hc-font-mono)' }}>{item.precio}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
