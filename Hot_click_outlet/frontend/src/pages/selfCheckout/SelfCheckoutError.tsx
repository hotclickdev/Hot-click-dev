/**
 * QR inválido o mesa desactivada.
 */
export default function SelfCheckoutError({ error }: { error: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4" style={{ backgroundColor: '#0f0f17' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <p className="text-lg font-bold text-white">QR inválido</p>
      <p className="text-sm text-gray-400 text-center">{error}</p>
    </div>
  )
}
