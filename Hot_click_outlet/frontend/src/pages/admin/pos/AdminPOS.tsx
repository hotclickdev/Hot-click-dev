import POSHeader from './POSHeader'
import POSLoadingScreen from './POSLoadingScreen'
import AdminPOSSteps from './AdminPOSSteps'
import { useAdminPOS } from './useAdminPOS'
import { posUi } from './posApariencia'

export default function AdminPOS() {
  const pos = useAdminPOS()

  if (pos.step === 'loading') {
    return <POSLoadingScreen />
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: posUi.fondo }}>
      <POSHeader userName={pos.userName} turno={pos.turno} step={pos.step}
        mostrarVolverSistema={pos.userRole !== 'CAJERO'} />

      <AdminPOSSteps pos={pos} />
    </div>
  )
}
