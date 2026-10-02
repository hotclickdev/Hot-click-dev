/**
 * Spinner de carga del self-checkout.
 */
export default function SelfCheckoutLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--hc-n-50)]">
      <div
        role="status"
        className="size-10 animate-spin rounded-full border-2 border-[var(--hc-n-200)] border-t-[var(--hc-blue-600)]"
      />
    </div>
  )
}
