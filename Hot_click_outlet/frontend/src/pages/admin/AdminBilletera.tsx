import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { walletService } from '@/services/walletService'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import KpiBox from './billetera/KpiBox'
import PayoutModal from './billetera/PayoutModal'
import BilleteraMovimientosTable from './billetera/BilleteraMovimientosTable'
import BilleteraRetirosTable from './billetera/BilleteraRetirosTable'
import type { WalletPayout, WalletSaldo, WalletTx } from './billetera/billeteraHelpers'

type TabBilletera = 'movimientos' | 'retiros'

const TAB_KEYS: [TabBilletera, string][] = [
  ['movimientos', 'adminBilletera.tabMovimientos'],
  ['retiros', 'adminBilletera.tabRetiros'],
]

export default function AdminBilletera() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [wallet, setWallet] = useState<WalletSaldo | null>(null)
  const [txs, setTxs] = useState<WalletTx[]>([])
  const [payouts, setPayouts] = useState<WalletPayout[]>([])
  const [txPage, setTxPage] = useState(0)
  const [txTotal, setTxTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab] = useState<TabBilletera>('movimientos')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [wRes, txRes, prRes] = await Promise.all([
        walletService.getSaldo(),
        walletService.getTransacciones(txPage),
        walletService.getPayouts(),
      ])
      setWallet(wRes.data as WalletSaldo)
      const txData = txRes.data as { content?: WalletTx[]; totalPages?: number }
      setTxs(txData.content ?? [])
      setTxTotal(txData.totalPages ?? 1)
      const prData = prRes.data as { content?: WalletPayout[] }
      setPayouts(prData.content ?? [])
    } catch {
      showToast(t('adminBilletera.errorLoad'), 'error')
    } finally {
      setLoading(false)
    }
  }, [txPage, showToast, t])

  useEffect(() => { fetchAll() }, [fetchAll]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar / cambiar página

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  const hayPayoutActivo = payouts.some((p) => p.estado === 'PENDIENTE' || p.estado === 'EN_PROCESO')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t('adminBilletera.title')}</h1>
          <p className="text-sm text-hc-muted mt-0.5">
            {t('adminBilletera.subtitle')}
          </p>
        </div>
        <button type="button"
          onClick={() => setShowModal(true)}
          disabled={hayPayoutActivo || !wallet?.saldoDisponible}
          className="px-4 py-2 rounded-xl text-sm bg-[var(--color-accent)] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('adminBilletera.requestPayout')}
        </button>
      </div>

      {hayPayoutActivo && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-sm text-yellow-300">
          {t('adminBilletera.payoutInProgress')}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiBox label={t('adminBilletera.kpiAvailable')} value={wallet?.saldoDisponible} color="#4ade80" sub={t('adminBilletera.kpiAvailableSub')} />
        <KpiBox label={t('adminBilletera.kpiHeld')} value={wallet?.saldoRetenido} color="#facc15" sub={t('adminBilletera.kpiHeldSub')} />
        <KpiBox label={t('adminBilletera.kpiCredited')} value={wallet?.totalAcreditado} color="#60a5fa" sub={t('adminBilletera.kpiCreditedSub')} />
        <KpiBox label={t('adminBilletera.kpiWithdrawn')} value={wallet?.totalRetirado} color="#c084fc" sub={t('adminBilletera.kpiWithdrawnSub')} />
      </div>

      <div className="bg-hc-surface border border-hc-border rounded-2xl p-5">
        <h2 className="text-sm font-medium mb-3 text-hc-muted">{t('adminBilletera.howCalculated')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-white/4 rounded-xl p-3">
            <p className="text-hc-muted text-xs mb-1">{t('adminBilletera.clientPays')}</p>
            <p className="font-semibold">100%</p>
          </div>
          <div className="bg-red-500/8 rounded-xl p-3">
            <p className="text-red-400 text-xs mb-1">{t('adminBilletera.platformFee')}</p>
            <p className="font-semibold text-red-300">− 2%</p>
          </div>
          <div className="bg-red-500/8 rounded-xl p-3">
            <p className="text-red-400 text-xs mb-1">{t('adminBilletera.gatewayFee')}</p>
            <p className="font-semibold text-red-300">− 3%</p>
          </div>
        </div>
        <p className="text-xs text-hc-muted mt-3">
          {t('adminBilletera.netExplainer')}
        </p>
      </div>

      <div className="flex gap-1 border-b border-hc-border">
        {TAB_KEYS.map(([k, key]) => (
          <button type="button" key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === k ? 'border-b-2 border-hc-primary text-hc-text' : 'text-hc-muted hover:text-hc-text'
            }`}>
            {t(key)}
          </button>
        ))}
      </div>

      {tab === 'movimientos' && (
        <BilleteraMovimientosTable
          txs={txs}
          txPage={txPage}
          txTotal={txTotal}
          onPage={setTxPage}
        />
      )}

      {tab === 'retiros' && (
        <BilleteraRetirosTable payouts={payouts} />
      )}

      {showModal && (
        <PayoutModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAll() }}
        />
      )}
    </div>
  )
}
