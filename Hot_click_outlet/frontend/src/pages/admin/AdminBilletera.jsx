import { useState, useEffect, useCallback } from 'react'
import { walletService } from '@/services/walletService'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import KpiBox from './billetera/KpiBox'
import PayoutModal from './billetera/PayoutModal'
import BilleteraMovimientosTable from './billetera/BilleteraMovimientosTable'
import BilleteraRetirosTable from './billetera/BilleteraRetirosTable'

export default function AdminBilletera() {
  const { showToast } = useToast()
  const [wallet, setWallet] = useState(null)
  const [txs, setTxs] = useState([])
  const [payouts, setPayouts] = useState([])
  const [txPage, setTxPage] = useState(0)
  const [txTotal, setTxTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab] = useState('movimientos')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [wRes, txRes, prRes] = await Promise.all([
        walletService.getSaldo(),
        walletService.getTransacciones(txPage),
        walletService.getPayouts(),
      ])
      setWallet(wRes.data)
      setTxs(txRes.data.content ?? [])
      setTxTotal(txRes.data.totalPages ?? 1)
      setPayouts(prRes.data.content ?? [])
    } catch {
      showToast('Error cargando billetera', 'error')
    } finally {
      setLoading(false)
    }
  }, [txPage]) // eslint-disable-line react-hooks/exhaustive-deps -- showToast es estable

  useEffect(() => { fetchAll() }, [fetchAll]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar / cambiar página

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  const hayPayoutActivo = payouts.some((p) => p.estado === 'PENDIENTE' || p.estado === 'EN_PROCESO')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Mi Billetera</h1>
          <p className="text-sm text-[#8e8e9a] mt-0.5">
            Saldo de ventas procesadas por la plataforma
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={hayPayoutActivo || !wallet?.saldoDisponible}
          className="px-4 py-2 rounded-xl text-sm bg-[var(--color-accent)] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Solicitar retiro
        </button>
      </div>

      {hayPayoutActivo && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-sm text-yellow-300">
          Tienes un retiro en proceso. Espera a que sea resuelto antes de solicitar otro.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiBox label="Saldo disponible" value={wallet?.saldoDisponible} color="#4ade80" sub="Listo para retirar" />
        <KpiBox label="Retenido" value={wallet?.saldoRetenido} color="#facc15" sub="Retiro en proceso" />
        <KpiBox label="Total acreditado" value={wallet?.totalAcreditado} color="#60a5fa" sub="Ventas históricas netas" />
        <KpiBox label="Total retirado" value={wallet?.totalRetirado} color="#c084fc" sub="Pagos procesados" />
      </div>

      <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
        <h2 className="text-sm font-medium mb-3 text-[#8e8e9a]">¿Cómo se calcula tu saldo?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-white/4 rounded-xl p-3">
            <p className="text-[#8e8e9a] text-xs mb-1">Total que paga el cliente</p>
            <p className="font-semibold">100%</p>
          </div>
          <div className="bg-red-500/8 rounded-xl p-3">
            <p className="text-red-400 text-xs mb-1">Comisión plataforma</p>
            <p className="font-semibold text-red-300">− 2%</p>
          </div>
          <div className="bg-red-500/8 rounded-xl p-3">
            <p className="text-red-400 text-xs mb-1">Comisión pasarela (estimado)</p>
            <p className="font-semibold text-red-300">− 3%</p>
          </div>
        </div>
        <p className="text-xs text-[#8e8e9a] mt-3">
          Tu saldo neto ={' '}<span className="text-green-400 font-medium">95%</span>{' '}del total bruto de cada venta.
          El IVA (13%) ya está incluido en el precio de tus productos y es tu obligación declararlo a Hacienda.
          Tus comprobantes electrónicos se generan automáticamente.
        </p>
      </div>

      <div className="flex gap-1 border-b border-white/8">
        {[['movimientos', 'Movimientos'], ['retiros', 'Historial de retiros']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === k ? 'border-b-2 border-[var(--color-accent)] text-white' : 'text-[#8e8e9a] hover:text-white'
            }`}>
            {label}
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
