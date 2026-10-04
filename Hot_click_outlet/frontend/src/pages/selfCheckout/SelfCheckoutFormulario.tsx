import { useTranslation } from 'react-i18next'
import TextoFlecha from '@/components/ui/TextoFlecha'
import { fmt } from './selfCheckoutFormat'
import type { CarritoSelfCheckout, FormSelfCheckout, SetFormSelfCheckout } from './selfCheckoutTypes'

const CAMPO =
  'w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-3 text-[14px] text-hc-n-900 outline-none placeholder:text-hc-n-500 focus:border-hc-blue-600'

/**
 * Confirmación del pedido antes de enviarlo (nombre, teléfono y notas son
 * opcionales). Figma no dibuja este paso: usa la tarjeta "Tu pedido" de
 * `29:1761` y los controles de las pantallas QR.
 * El envío vive en el padre.
 */
export default function SelfCheckoutFormulario({
  carrito,
  form,
  error,
  enviando,
  totalPrecio,
  setForm,
  onVolver,
  onEnviar,
}: Readonly<{
  carrito: CarritoSelfCheckout
  form: FormSelfCheckout
  error: string | null
  enviando: boolean
  totalPrecio: number
  setForm: SetFormSelfCheckout
  onVolver: () => void
  onEnviar: () => void
}>) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4">
      <button
        type="button"
        onClick={onVolver}
        className="flex items-center gap-2 self-start text-[14px] text-hc-n-600"
      >
        <TextoFlecha dir="atras">{t('pos.mesa.volver')}</TextoFlecha>
      </button>

      <section className="flex flex-col gap-2 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4">
        <h2 className="font-sans text-[14px] font-semibold leading-4 tracking-normal text-hc-n-900">
          {t('pos.mesa.tuPedido')}
        </h2>
        <ul className="flex flex-col gap-2">
          {Object.values(carrito).map(({ producto, cantidad }) => (
            <li key={String(producto.id)} className="flex items-center justify-between gap-3 text-[14px]">
              <span className="min-w-0 truncate text-hc-n-600">
                {cantidad} × {producto.nombre}
              </span>
              <span className="shrink-0 text-hc-n-900">{fmt((producto.precio ?? 0) * cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="h-px bg-hc-n-200" />
        <div className="flex items-center justify-between text-hc-n-900">
          <span className="text-[15px] font-semibold">{t('pos.mesa.total')}</span>
          <span className="font-display text-[18px] font-bold">{fmt(totalPrecio)}</span>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <input
          placeholder={t('pos.mesa.nombre')}
          aria-label={t('pos.mesa.nombre')}
          value={form.clienteNombre}
          onChange={(e) => setForm((p) => ({ ...p, clienteNombre: e.target.value }))}
          className={CAMPO}
        />
        <input
          placeholder={t('pos.mesa.telefono')}
          aria-label={t('pos.mesa.telefono')}
          inputMode="tel"
          value={form.clienteTel}
          onChange={(e) => setForm((p) => ({ ...p, clienteTel: e.target.value }))}
          className={CAMPO}
        />
        <textarea
          placeholder={t('pos.mesa.notas')}
          aria-label={t('pos.mesa.notas')}
          rows={2}
          value={form.notas}
          onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
          className={`${CAMPO} resize-none`}
        />
      </div>

      {error ? <p className="text-[13px] text-hc-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={onEnviar}
        disabled={enviando}
        className="hc-btn-primary mt-auto min-h-[46px] w-full rounded-[12px] px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-white disabled:opacity-50"
      >
        {enviando ? t('pos.mesa.enviando') : t('pos.mesa.realizar', { monto: fmt(totalPrecio) })}
      </button>
    </div>
  )
}
