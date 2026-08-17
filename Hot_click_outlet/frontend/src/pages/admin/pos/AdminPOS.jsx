import POSHeader from './POSHeader'
import CierreTurnoModal from './CierreTurnoModal'
import POSLoadingScreen from './POSLoadingScreen'
import AdminPOSSteps from './AdminPOSSteps'
import { useAdminPOS } from './useAdminPOS'

export default function AdminPOS() {
  const pos = useAdminPOS()

  if (pos.step === 'loading') {
    return <POSLoadingScreen />
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: '#08080c', fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace" }}>
      <POSHeader userName={pos.userName} turno={pos.turno} step={pos.step} onCerrarTurno={() => pos.setShowCierre(true)}
        mostrarVolverSistema={pos.userRole !== 'CAJERO'} />

      {pos.showCierre && (
        <CierreTurnoModal
          saving={pos.saving}
          onCancel={() => pos.setShowCierre(false)}
          onCerrar={pos.handleCerrarTurno}
          onTotal={pos.setMontoFinalCierre}
        />
      )}

      <AdminPOSSteps pos={pos} />
    </div>
  )
}
