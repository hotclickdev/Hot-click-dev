import { useState } from 'react'
import POSHeader from './POSHeader'
import POSLoadingScreen from './POSLoadingScreen'
import AdminPOSSteps from './AdminPOSSteps'
import PosReporteModal from './PosReporteModal'
import PosReportePendienteBanner from './PosReportePendienteBanner'
import { useAdminPOS } from './useAdminPOS'
import { posUi } from './posApariencia'
import { useCabeceraPanelEnPos } from './useCabeceraPanelEnPos'

export default function AdminPOS() {
  const pos = useAdminPOS()
  const [reporteModalAbierto, setReporteModalAbierto] = useState(false)
  const conCabeceraPanel = useCabeceraPanelEnPos()

  if (pos.step === 'loading') {
    return <POSLoadingScreen />
  }

  const cerrarReporteModal = () => {
    setReporteModalAbierto(false)
    pos.limpiarReportePendiente()
  }

  return (
    <div
      className={`flex flex-col h-screen overflow-hidden ${conCabeceraPanel ? 'max-md:h-[calc(100dvh-3.5rem)]' : ''}`}
      style={{ backgroundColor: posUi.fondo }}>
      <POSHeader userName={pos.userName} turno={pos.turno} step={pos.step}
        mostrarVolverSistema={pos.userRole !== 'CAJERO'} />

      {pos.reportePendiente ? (
        <PosReportePendienteBanner
          mensaje={pos.reportePendiente.mensaje}
          onReportar={() => setReporteModalAbierto(true)}
        />
      ) : null}

      <AdminPOSSteps pos={pos} />

      <PosReporteModal
        open={reporteModalAbierto}
        onClose={cerrarReporteModal}
        pasoActual={String(pos.step)}
      />
    </div>
  )
}
