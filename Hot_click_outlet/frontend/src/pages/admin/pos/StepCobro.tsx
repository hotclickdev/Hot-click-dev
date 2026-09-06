import { useState, useEffect, useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { HotClickMark } from '@/components/ui/BrandLogo'
import TextoFlecha from '@/components/ui/TextoFlecha'
import { METODOS, formatMontoPos, sugerirMontos, descomponer, type ItemCarritoPos, type PayloadCobroPos } from './posHelpers'
import { MetodoPagoIcon } from './posIcons'

export default function StepCobro({ total, cartItems, descuento, onBack, onConfirmar, loading }: {
  total: number
  cartItems: ItemCarritoPos[]
  descuento: number
  onBack: () => void
  onConfirmar: (payload: PayloadCobroPos) => void
  loading: boolean
}) {
  const { t } = useTranslation()
  const [metodo, setMetodo] = useState('EFECTIVO')
  const [recibido, setRecibido] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [metodo])

  const recibidoNum = Number.parseInt(String(recibido).replace(/\D/g, '') || '0')
  const vuelto = metodo === 'EFECTIVO' && recibidoNum > total ? recibidoNum - total : 0
  const faltante = metodo === 'EFECTIVO' && recibidoNum > 0 && recibidoNum < total
  const puedeConfirmar = metodo !== 'EFECTIVO' || (recibidoNum >= total && recibidoNum > 0)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-lg space-y-5 px-5 py-6">
        <CabeceraCobro onBack={onBack} />
        <LineasTicket items={cartItems} descuento={descuento} total={total} />
        <p className="text-xs font-medium text-hc-muted">{t('pos.cobro.metodoPago')}</p>
        <ChipsMetodo metodo={metodo} onChange={setMetodo} />
        {metodo === 'EFECTIVO' && (
          <CalculadoraEfectivo
            total={total}
            recibido={recibido}
            recibidoNum={recibidoNum}
            vuelto={vuelto}
            faltante={faltante}
            puedeConfirmar={puedeConfirmar}
            inputRef={inputRef}
            onRecibido={setRecibido}
          />
        )}
        {(metodo === 'SINPE' || metodo === 'TARJETA') && <AvisoQr metodo={metodo} />}
        <button
          type="button"
          onClick={() => onConfirmar({ metodoPago: metodo, montoRecibido: metodo === 'EFECTIVO' ? recibidoNum : null })}
          disabled={!puedeConfirmar || loading}
          className="w-full rounded-[14px] py-4 text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-30"
          style={{ background: puedeConfirmar ? 'var(--hc-primary)' : 'var(--hc-surface-2)' }}
        >
          {etiquetaConfirmarCobro(t, loading, metodo)}
        </button>
      </div>
    </div>
  )
}

function CabeceraCobro({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  return (
    <div>
      <HotClickMark size={20} className="mb-1" />
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={onBack} className="font-display text-xl font-bold" aria-label={t('pos.cobro.volverAria')}>
          <TextoFlecha dir="atras" />
        </button>
        <h1 className="font-display text-xl font-bold">{t('pos.cobro.title')}</h1>
      </div>
    </div>
  )
}

function LineasTicket({ items, descuento, total }: { items: ItemCarritoPos[]; descuento: number; total: number }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="flex justify-between gap-3 text-[13px]">
          <span>{item.nombre}  x{item.cantidad}</span>
          <span className="shrink-0 font-medium">₡{formatMontoPos(Number(item.precio) * item.cantidad)}</span>
        </div>
      ))}
      {descuento > 0 && (
        <div className="flex justify-between text-[13px] text-hc-danger">
          <span>{t('pos.cobro.descuento')}</span>
          <span>-₡{formatMontoPos(descuento)}</span>
        </div>
      )}
      <div className="h-px bg-hc-border" />
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-bold">{t('pos.cobro.totalACobrar')}</span>
        <span className="font-display text-xl font-bold text-hc-primary">₡{formatMontoPos(total)}</span>
      </div>
    </div>
  )
}

function ChipsMetodo({ metodo, onChange }: { metodo: string; onChange: (id: string) => void }) {
  const { t } = useTranslation()
  const chipLabel: Record<string, string> = {
    EFECTIVO: t('pos.cobro.efectivo'),
    SINPE: t('pos.cobro.sinpe'),
    TARJETA: t('pos.cobro.tarjeta'),
  }
  return (
    <div className="flex flex-wrap gap-2">
      {METODOS.map((opcion) => {
        const activo = metodo === opcion.id
        return (
          <button
            type="button"
            key={opcion.id}
            onClick={() => onChange(opcion.id)}
            className={`rounded-xl px-4 py-2.5 text-xs ${
              activo ? 'bg-hc-primary font-bold text-white' : 'border border-hc-border font-medium text-hc-text'
            }`}
          >
            {chipLabel[opcion.id] ?? opcion.label}
          </button>
        )
      })}
    </div>
  )
}

function CalculadoraEfectivo({
  total,
  recibido,
  recibidoNum,
  vuelto,
  faltante,
  puedeConfirmar,
  inputRef,
  onRecibido,
}: {
  total: number
  recibido: string
  recibidoNum: number
  vuelto: number
  faltante: boolean
  puedeConfirmar: boolean
  inputRef: RefObject<HTMLInputElement | null>
  onRecibido: (v: string) => void
}) {
  const { t } = useTranslation()
  const billetesSugeridos = descomponer(vuelto)
  return (
    <div className="space-y-3 rounded-2xl border border-hc-border bg-hc-surface p-4">
      <p className="text-xs font-semibold text-hc-muted">{t('pos.cobro.montoRecibido')}</p>
      <BotonesMontoSugerido total={total} recibidoNum={recibidoNum} onRecibido={onRecibido} />
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-hc-muted">₡</span>
        <input
          ref={inputRef}
          type="number"
          min={0}
          value={recibido}
          placeholder="0"
          onChange={(e) => onRecibido(e.target.value)}
          className="w-full rounded-xl py-4 pl-9 pr-4 text-2xl font-black tabular-nums outline-none"
          style={{
            backgroundColor: 'var(--hc-surface-2)',
            border: `2px solid ${bordeInputCobro(puedeConfirmar, recibidoNum, faltante)}`,
            color: 'var(--hc-text)',
          }}
        />
      </div>
      {recibidoNum > 0 && (
        <div
          className="rounded-xl p-3"
          style={{
            backgroundColor: vuelto >= 0 && !faltante ? 'var(--hc-success-bg)' : 'var(--hc-danger-bg)',
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-hc-muted">{faltante ? t('pos.cobro.faltante') : t('pos.cobro.vuelto')}</span>
            <span className={`text-2xl font-black tabular-nums ${faltante ? 'text-hc-danger' : 'text-hc-success'}`}>
              ₡{formatMontoPos(Math.abs(recibidoNum - total))}
            </span>
          </div>
          {vuelto > 0 && billetesSugeridos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {billetesSugeridos.map((billete, i) => (
                <span key={i} className="rounded-lg px-2 py-1 text-xs font-bold" style={{ backgroundColor: billete.bg, color: billete.color }}>
                  {billete.q}× {billete.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BotonesMontoSugerido({
  total,
  recibidoNum,
  onRecibido,
}: {
  total: number
  recibidoNum: number
  onRecibido: (v: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-2">
      {sugerirMontos(total).map((monto) => {
        const exacto = monto === total
        const activo = recibidoNum === monto
        return (
          <button
            type="button"
            key={monto}
            onClick={() => onRecibido(String(monto))}
            aria-label={exacto ? `${t('pos.cobro.pagoExacto')} ₡${formatMontoPos(monto)}` : undefined}
            className="rounded-xl px-3 py-2 text-sm font-bold text-hc-text"
            style={{
              backgroundColor: activo ? 'var(--hc-danger-bg)' : 'var(--hc-surface-2)',
              border: `1px solid ${activo ? 'var(--hc-primary)' : 'var(--hc-border)'}`,
            }}
          >
            {exacto
              ? `${t('pos.cobro.pagoExacto')} ₡${formatMontoPos(monto)}`
              : `₡${formatMontoPos(monto)}`}
          </button>
        )
      })}
    </div>
  )
}

function AvisoQr({ metodo }: { metodo: string }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1 rounded-2xl border border-hc-border bg-hc-surface-2 p-4 text-center">
      <p className="flex items-center justify-center gap-2 text-sm font-semibold text-hc-text">
        <MetodoPagoIcon iconId={metodo === 'SINPE' ? 'sinpe' : 'tarjeta'} className="h-4 w-4" />
        {metodo === 'SINPE' ? t('pos.cobro.avisoSinpeTitle') : t('pos.cobro.avisoTarjetaTitle')}
      </p>
      <p className="text-xs text-hc-muted">
        {metodo === 'SINPE'
          ? t('pos.cobro.avisoSinpeDesc')
          : t('pos.cobro.avisoTarjetaDesc')}
      </p>
    </div>
  )
}

function bordeInputCobro(puedeConfirmar: boolean, recibidoNum: number, faltante: boolean | number) {
  if (puedeConfirmar && recibidoNum > 0) return 'var(--hc-success)'
  if (faltante) return 'var(--hc-danger)'
  return 'var(--hc-border)'
}

function etiquetaConfirmarCobro(t: TFunction, loading: boolean, metodo: string) {
  if (loading) return t('pos.cobro.procesando')
  if (metodo === 'SINPE' || metodo === 'TARJETA') return t('pos.cobro.generarQr')
  return t('pos.cobro.confirmarCobro')
}
