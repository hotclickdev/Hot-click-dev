import { fmt, TIPO_LABEL, type WalletTx } from './billeteraHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'

/** Tabla de movimientos de billetera. */
export default function BilleteraMovimientosTable({ txs, txPage, txTotal, onPage }: {
  txs: WalletTx[]
  txPage: number
  txTotal: number
  onPage: (page: number) => void
}) {
  return (
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
          {txs.map((tx) => {
            const meta = TIPO_LABEL[tx.tipo] ?? { text: tx.tipo, color: 'text-gray-400' }
            const esPos = tx.monto > 0
            return (
              <tr key={tx.id} className="border-b border-white/4 hover:bg-white/2">
                <td className="px-4 py-3 text-[#8e8e9a] whitespace-nowrap">
                  {new Date(tx.fechaCreacion).toLocaleString('es-CR', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td className={`px-4 py-3 font-medium ${meta.color}`}>{meta.text}</td>
                <td className="px-4 py-3 text-[#8e8e9a]">
                  <span>{tx.descripcion}</span>
                  {tx.tipo === 'CREDITO_VENTA' && tx.totalBruto && (
                    <span className="ml-2 text-xs text-[#555]">
                      (bruto ₡{fmt(tx.totalBruto)} − com. ₡{fmt(tx.comisionSaas! + tx.comisionGw!)})
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
          <button type="button" disabled={txPage === 0}
            onClick={() => onPage(txPage - 1)}
            className="px-3 py-1.5 rounded-lg text-sm border border-white/10 disabled:opacity-30">
            <TextoFlecha dir="atras">Anterior</TextoFlecha>
          </button>
          <span className="text-xs text-[#8e8e9a] self-center">Pág. {txPage + 1} / {txTotal}</span>
          <button type="button" disabled={txPage >= txTotal - 1}
            onClick={() => onPage(txPage + 1)}
            className="px-3 py-1.5 rounded-lg text-sm border border-white/10 disabled:opacity-30">
            <TextoFlecha>Siguiente</TextoFlecha>
          </button>
        </div>
      )}
    </div>
  )
}
