import type { Dispatch, SetStateAction } from 'react'
import IconoAsistente from '@/components/ai/IconoAsistente'

/**
 * Botón lateral para abrir/cerrar el asistente IA del catálogo.
 */
export default function CatalogAiFab({
  aiPanelOpen, setAiPanelOpen,
}: {
  aiPanelOpen: boolean
  setAiPanelOpen: Dispatch<SetStateAction<boolean>>
}) {
  return (
    <button type="button"
      onClick={() => setAiPanelOpen((v) => !v)}
      className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 py-4 px-1.5 rounded-r-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
      style={{
        background: aiPanelOpen ? 'rgba(255,255,255,0.12)' : 'var(--hc-accent)',
        color: '#fff',
        border: aiPanelOpen ? '1px solid rgba(255,255,255,0.2)' : 'none',
        backdropFilter: aiPanelOpen ? 'blur(8px)' : 'none',
      }}
      aria-label={aiPanelOpen ? 'Cerrar asistente IA' : 'Abrir asistente IA'}
    >
      <span
        className="inline-flex"
        style={{ animation: aiPanelOpen ? 'none' : 'hc-fab-pulse 2s ease-in-out infinite' }}
        aria-hidden="true"
      >
        <IconoAsistente className="w-3.5 h-3.5" />
      </span>
      <span style={{
        writingMode: 'vertical-lr',
        transform: 'rotate(180deg)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      }}>¿DUDAS?</span>
      <style>{`@keyframes hc-fab-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.15)}}`}</style>
    </button>
  )
}
