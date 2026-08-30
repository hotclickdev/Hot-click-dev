/**
 * Spinner de carga del self-checkout.
 */
export default function SelfCheckoutLoading({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f17' }}>
      <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: '#333', borderTopColor: primaryColor }} />
    </div>
  )
}
