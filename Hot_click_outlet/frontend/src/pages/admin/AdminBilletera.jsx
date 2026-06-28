import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

const TIPO_LABEL = {
  CREDITO_VENTA:    { text: 'Venta',           color: 'text-green-400'  },
  DEBITO_PAYOUT:    { text: 'Retiro pagado',    color: 'text-red-400'    },
  RETENCION_PAYOUT: { text: 'Retiro retenido',  color: 'text-yellow-400' },
  LIBERACION_PAYOUT:{ text: 'Retiro liberado',  color: 'text-blue-400'   },
  DEVOLUCION:       { text: 'Devolución',        color: 'text-orange-400' },
  AJUSTE_MANUAL:    { text: 'Ajuste manual',     color: 'text-gray-400'   },
}

const ESTADO_BADGE = {
  PENDIENTE:  'bg-yellow-500/15 text-yellow-300',
  EN_PROCESO: 'bg-blue-500/15 text-blue-300',
  PAGADO:     'bg-green-500/15 text-green-300',
  RECHAZADO:  'bg-red-500/15 text-red-300',
}

function KpiBox({ label, value, color = '#4ade80', sub }) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
      <p className="text-xs text-[#8e8e9a] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>₡{fmt(value)}</p>
      {sub && <p className="text-xs text-[#8e8e9a] mt-1">{sub}</p>}
    </div>
  )
}

/* ── Modal de solicitud de retiro ──────────────────────────────────── */
function PayoutModal({ onClose, onSaved }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    monto: '',
    metodo: 'SINPE',
    destinoSinpe: '',
    destinoIban: '',
    nombreTitular: '',
    bancoDestino: '',
    notas: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSave = async () => {
    if (!form.monto || Number(form.monto) <= 0) {
      showToast('Ingresa un monto válido', 'error'); return
    }
    if (form.metodo === 'SINPE' && !/^\d{8}$/.test(form.destinoSinpe)) {
      showToast('El número SINPE debe tener 8 dígitos', 'error'); return
    }
    if (form.metodo === 'TRANSFERENCIA' && (!form.destinoIban || !form.nombreTitular)) {
      showToast('IBAN y nombre del titular son requeridos', 'error'); return
    }
    setSaving(true)
    try {
      await api.post('/wallet/payout', { ...form, monto: Number(form.monto) })
      showToast('Solicitud de retiro enviada', 'success')
      onSaved()
    } catch (e) {
      showToast(e?.response?.data?.message ?? 'Error al solicitar retiro', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#16161a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold mb-5">Solicitar retiro</h2>

        <label htmlFor="bil-monto" className="block text-xs text-[#8e8e9a] mb-1">Monto (₡)</label>
        <input id="bil-monto"
          type="number" min="1" className="input-base w-full mb-4"
          placeholder="Ej: 50000"
          value={form.monto} onChange={set('monto')}
        />

        <label htmlFor="bil-metodo" className="block text-xs text-[#8e8e9a] mb-1">Método de pago</label>
        <select id="bil-metodo" className="input-base w-full mb-4" value={form.metodo} onChange={set('metodo')}>
          <option value="SINPE">SINPE Móvil</option>
          <option value="TRANSFERENCIA">Transferencia bancaria</option>
        </select>

        {form.metodo === 'SINPE' && (
          <>
            <label htmlFor="bil-sinpe" className="block text-xs text-[#8e8e9a] mb-1">Número SINPE (8 dígitos)</label>
            <input id="bil-sinpe"
              type="tel" maxLength={8} className="input-base w-full mb-4"
              placeholder="88001234"
              value={form.destinoSinpe} onChange={set('destinoSinpe')}
            />
          </>
        )}

        {form.metodo === 'TRANSFERENCIA' && (
          <>
            <label htmlFor="bil-iban" className="block text-xs text-[#8e8e9a] mb-1">IBAN</label>
            <input id="bil-iban" className="input-base w-full mb-3" placeholder="CR21 0152 0200 1026 2840 66"
              value={form.destinoIban} onChange={set('destinoIban')} />
            <label htmlFor="bil-titular" className="block text-xs text-[#8e8e9a] mb-1">Nombre del titular</label>
            <input id="bil-titular" className="input-base w-full mb-3"
              value={form.nombreTitular} onChange={set('nombreTitular')} />
            <label htmlFor="bil-banco" className="block text-xs text-[#8e8e9a] mb-1">Banco</label>
            <input id="bil-banco" className="input-base w-full mb-3"
              value={form.bancoDestino} onChange={set('bancoDestino')} />
          </>
        )}

        <label htmlFor="bil-notas" className="block text-xs text-[#8e8e9a] mb-1">Notas (opcional)</label>
        <textarea id="bil-notas" className="input-base w-full mb-5 resize-none" rows={2}
          value={form.notas} onChange={set('notas')} />

        <div className="flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border border-white/10 hover:bg-white/5">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm bg-[var(--color-accent)] text-white font-medium disabled:opacity-50">
            {saving ? 'Enviando…' : 'Solicitar retiro'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Página principal ──────────────────────────────────────────────── */
export default function AdminBilletera() {
  const { showToast } = useToast()
  const [wallet,    setWallet]    = useState(null)
  const [txs,       setTxs]       = useState([])
  const [payouts,   setPayouts]   = useState([])
  const [txPage,    setTxPage]    = useState(0)
  const [txTotal,   setTxTotal]   = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [tab,       setTab]       = useState('movimientos') // 'movimientos' | 'retiros'

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [wRes, txRes, prRes] = await Promise.all([
        api.get('/wallet/saldo'),
        api.get(`/wallet/transacciones?page=${txPage}&size=15`),
        api.get('/wallet/payouts?page=0&size=50'),
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
  }, [txPage])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  const hayPayoutActivo = payouts.some(p => p.estado === 'PENDIENTE' || p.estado === 'EN_PROCESO')

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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiBox label="Saldo disponible"   value={wallet?.saldoDisponible}  color="#4ade80" sub="Listo para retirar" />
        <KpiBox label="Retenido"           value={wallet?.saldoRetenido}    color="#facc15" sub="Retiro en proceso" />
        <KpiBox label="Total acreditado"   value={wallet?.totalAcreditado}  color="#60a5fa" sub="Ventas históricas netas" />
        <KpiBox label="Total retirado"     value={wallet?.totalRetirado}    color="#c084fc" sub="Pagos procesados" />
      </div>

      {/* Desglose de comisiones */}
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

      {/* Tabs */}
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

      {/* Movimientos */}
      {tab === 'movimientos' && (
        <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#8e8e9a] border-b border-white/8">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8e8e9a]">Sin movimientos aún</td></tr>
              )}
              {txs.map(tx => {
                const meta  = TIPO_LABEL[tx.tipo] ?? { text: tx.tipo, color: 'text-gray-400' }
                const esPos = tx.monto > 0
                return (
                  <tr key={tx.id} className="border-b border-white/4 hover:bg-white/2">
                    <td className="px-4 py-3 text-[#8e8e9a] whitespace-nowrap">
                      {new Date(tx.fechaCreacion).toLocaleString('es-CR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className={`px-4 py-3 font-medium ${meta.color}`}>{meta.text}</td>
                    <td className="px-4 py-3 text-[#8e8e9a]">
                      <span>{tx.descripcion}</span>
                      {tx.tipo === 'CREDITO_VENTA' && tx.totalBruto && (
                        <span className="ml-2 text-xs text-[#555]">
                          (bruto ₡{fmt(tx.totalBruto)} − com. ₡{fmt(tx.comisionSaas + tx.comisionGw)})
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${esPos ? 'text-green-400' : 'text-red-400'}`}>
                      {esPos ? '+' : ''}₡{fmt(Math.abs(tx.monto))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#8e8e9a]">
                      ₡{fmt(tx.saldoTrasMovimiento)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {txTotal > 1 && (
            <div className="flex gap-2 justify-center p-4">
              <button disabled={txPage === 0}
                onClick={() => setTxPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg text-sm border border-white/10 disabled:opacity-30">
                ← Anterior
              </button>
              <span className="text-xs text-[#8e8e9a] self-center">Pág. {txPage + 1} / {txTotal}</span>
              <button disabled={txPage >= txTotal - 1}
                onClick={() => setTxPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg text-sm border border-white/10 disabled:opacity-30">
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Retiros */}
      {tab === 'retiros' && (
        <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#8e8e9a] border-b border-white/8">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Notas admin</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8e8e9a]">Sin retiros aún</td></tr>
              )}
              {payouts.map(p => (
                <tr key={p.id} className="border-b border-white/4 hover:bg-white/2">
                  <td className="px-4 py-3 text-[#8e8e9a] whitespace-nowrap">
                    {new Date(p.fechaSolicitud).toLocaleDateString('es-CR')}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold">₡{fmt(p.monto)}</td>
                  <td className="px-4 py-3">{p.metodo}</td>
                  <td className="px-4 py-3 text-[#8e8e9a]">
                    {p.metodo === 'SINPE' ? p.destinoSinpe : (p.destinoIban ?? '—')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[p.estado] ?? ''}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8e8e9a] text-xs">{p.notasAdmin ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
