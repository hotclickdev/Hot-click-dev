import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { ChangeEvent } from 'react'

/** Checkbox del Acuerdo de Vendedores, error y botón de envío. */
export default function AcuerdoYSubmit({
  aceptaAcuerdo, onAceptaChange, error, loading,
}: {
  aceptaAcuerdo: boolean
  onAceptaChange: (e: ChangeEvent<HTMLInputElement>) => void
  error: string
  loading: boolean
}) {
  return (
    <>
      {/* Acuerdo de Vendedores: texto corto + enlace al acuerdo completo (decisión 13:55 CR, lo valida HOT_CLICK) */}
      <label className="flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-hc-n-200 bg-hc-n-0 p-3 text-[13px] leading-[19px] text-hc-n-900">
        <input
          type="checkbox"
          checked={aceptaAcuerdo}
          onChange={onAceptaChange}
          className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-[var(--hc-blue-600)]"
        />
        <span>
          Leí y acepto el{' '}
          <Link to="/acuerdo-vendedores" target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">Acuerdo de Vendedores</Link>{' '}
          y mi rol como Encargado de Tratamiento de los datos de mis clientes (Ley 8968).
        </span>
      </label>

      {error && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          role="alert" className="rounded-[12px] border border-hc-red-500 bg-hc-n-0 p-3 text-[13px] text-hc-n-900">
          {error}
        </motion.div>
      )}

      <button type="submit" disabled={loading || !aceptaAcuerdo}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-hc-red-500 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-hc-red-600 disabled:cursor-not-allowed disabled:bg-hc-n-200 disabled:text-hc-n-600">
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Registrando…
          </>
        ) : <TextoFlecha>Registrar mi negocio</TextoFlecha>}
      </button>
    </>
  )
}
