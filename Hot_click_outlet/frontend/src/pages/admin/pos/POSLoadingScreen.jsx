export default function POSLoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#08080c' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
    </div>
  )
}
