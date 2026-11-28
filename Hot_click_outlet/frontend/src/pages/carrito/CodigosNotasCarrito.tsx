import { useTranslation } from 'react-i18next'

const MAX_NOTAS = 300

/** "Notas para el pedido (opcional)": Figma `52:2139`. */
export function NotasPedido({ notas, onCambiar }: { notas: string; onCambiar: (valor: string) => void }) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-2 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <label htmlFor="notas-pedido" className="text-[14px] font-medium leading-[normal] text-hc-n-900">{t('cart.notasTitulo')}</label>
      <textarea
        id="notas-pedido"
        value={notas}
        maxLength={MAX_NOTAS}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder={t('cart.notasPh')}
        className="hc-input-libre h-[72px] w-full resize-none rounded-[12px] border border-hc-n-200 bg-hc-n-0 p-3 text-[14px] leading-[normal] text-hc-n-900 outline-none placeholder:text-hc-n-500"
      />
      <p className="text-[11px] leading-[15px] text-hc-n-600">{t('cart.notasAyuda')}</p>
    </section>
  )
}
