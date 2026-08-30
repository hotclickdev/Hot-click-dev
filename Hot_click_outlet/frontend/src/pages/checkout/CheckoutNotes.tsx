import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import SmartField from './SmartField'
import type { Dispatch, SetStateAction } from 'react'

type CheckoutNotesProps = {
  notas: string
  setNotas: Dispatch<SetStateAction<string>>
}

export default function CheckoutNotes({ notas, setNotas }: CheckoutNotesProps) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="rounded-2xl p-6"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <h2 className="font-semibold mb-4" style={{ color: 'var(--hc-text)' }}>
        {t('checkout.notes')} <span className="font-normal text-sm" style={{ color: 'var(--hc-muted)' }}>({t('checkout.optional')})</span>
      </h2>
      <SmartField
        id="notas"
        label=""
        multiline
        rows={3}
        value={notas}
        placeholder={t('checkout.notesPh')}
        helpText={t('checkout.charCount', { count: notas.length, max: 300 })}
        maxLength={300}
        onChange={(e) => setNotas(e.target.value)}
        onBlur={() => {}}
      />
    </motion.div>
  )
}
