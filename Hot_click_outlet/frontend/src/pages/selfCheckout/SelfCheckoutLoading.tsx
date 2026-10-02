/**
 * Spinner de carga del self-checkout.
 */
export default function SelfCheckoutLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-hc-n-50">
      <div
        role="status"
        className="size-10 animate-spin rounded-full border-2 border-hc-n-200 border-t-hc-blue-600"
      />
    </div>
  )
}
