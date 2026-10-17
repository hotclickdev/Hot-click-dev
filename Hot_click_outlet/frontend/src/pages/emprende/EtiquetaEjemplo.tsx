/**
 * BUG-S1-06 / S1-76 (LAN-6): rótulo para los montos ilustrativos de /emprende, así nadie confunde
 * un ejemplo con un precio real. Estilo de la insignia de plan (Figma, `--hc-danger-bg`).
 */
export default function EtiquetaEjemplo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex w-fit rounded-[5px] bg-[var(--hc-danger-bg)] px-2 py-0.5 text-[10px] font-bold uppercase text-hc-primary ${className}`}
    >
      Ejemplo
    </span>
  )
}
