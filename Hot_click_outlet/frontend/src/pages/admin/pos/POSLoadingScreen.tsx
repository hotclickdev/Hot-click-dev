import { posUi } from './posApariencia'

export default function POSLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center" style={{ backgroundColor: posUi.fondo }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
    </div>
  )
}
