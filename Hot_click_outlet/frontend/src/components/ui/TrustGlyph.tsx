const ALIAS = {
  whatsapp: 'chat',
  pago: 'candado',
}

const TRAZOS = {
  camara: [
    'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z',
    'M16 13a4 4 0 11-8 0 4 4 0 018 0z',
  ],
  buscar: [
    'M11 19a8 8 0 100-16 8 8 0 000 16z',
    'M21 21l-4.35-4.35',
  ],
  chat: ['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'],
  candado: [
    'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  ],
  paquete: [
    'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
    'M3.27 6.96 12 12.01 20.73 6.96',
  ],
  envio: [
    'M1 3h15v13H1z',
    'M16 8h4l3 3v5h-7V8z',
    'M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
    'M18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  ],
  garantia: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  estrella: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  rayo: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  check: ['M5 13l4 4L19 7'],
  casa: ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
  lista: [
    'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2',
    'M9 2h6a1 1 0 011 1v2H8V3a1 1 0 011-1z',
  ],
  monitor: ['M8 21h8', 'M12 17v4', 'M2 3h20v14H2z'],
  megafono: ['M11 5l8-2v18l-8-2H5a2 2 0 01-2-2V9a2 2 0 012-2h6z'],
  edificio: ['M3 21h18', 'M5 21V7l7-4 7 4v14', 'M9 21v-6h6v6'],
  bolsa: ['M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 01-8 0'],
  tarjeta: ['M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2z', 'M1 10h22'],
  sparkle: [
    'M12 3v3M12 18v3M3 12h3M18 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M17.8 6.2l-2.1 2.1M8.3 15.7l-2.1 2.1',
  ],
  clientes: [
    'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2',
    'M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    'M23 21v-2a4 4 0 00-3-3.87',
    'M16 3.13a4 4 0 010 7.75',
  ],
  reloj: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M12 6v6l4 2'],
  alerta: ['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  campana: ['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 01-3.46 0'],
  error: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M15 9l-6 6', 'M9 9l6 6'],
  idea: ['M9 18h6', 'M10 22h4', 'M12 2a7 7 0 00-4 12c.5 1 1 2 1 3h6c0-1 .5-2 1-3A7 7 0 0012 2z'],
  corazon: ['M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'],
  tendencia: ['M3 3v18h18', 'M7 14l4-4 4 4 6-6'],
  pin: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z', 'M12 13a3 3 0 100-6 3 3 0 000 6z'],
  silla: ['M5 11h14v2H5z', 'M7 13v7', 'M17 13v7', 'M6 11V6a2 2 0 012-2h8a2 2 0 012 2v5'],
  sobre: ['M4 6h16v12H4z', 'M4 6l8 6 8-6'],
  etiqueta: [
    'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z',
    'M7 7h.01',
  ],
  sol: [
    'M12 16a4 4 0 100-8 4 4 0 000 8z',
    'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M19.07 4.93l-1.41 1.41',
  ],
  luna: ['M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z'],
  info: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M12 16v-4', 'M12 8h.01'],
  atras: ['M15 19l-7-7 7-7'],
  adelante: ['M9 5l7 7-7 7'],
  mas: ['M12 5v14', 'M5 12h14'],
  menos: ['M5 12h14'],
  reenviar: [
    'M23 4v6h-6',
    'M1 20v-6h6',
    'M3.51 9a9 9 0 0114.85-3.36L23 10',
    'M1 14l4.64 4.36A9 9 0 0020.49 15',
  ],
  guardar: ['M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7z', 'M7 3v5h8V3', 'M7 13h10'],
  papelera: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6'],
}

/** Ícono de trazo para sellos de confianza y pasos. Sin caracteres decorativos. */
export default function TrustGlyph({ tipo, className = 'w-4 h-4' }: { tipo: string; className?: string }) {
  const clave = (ALIAS as Record<string, string>)[tipo] ?? tipo
  if (clave === 'cr') {
    return (
      <span className="text-[9px] font-bold leading-none tracking-wide" aria-hidden="true">
        CR
      </span>
    )
  }
  const paths = (TRAZOS as Record<string, string[]>)[clave]
  if (!paths) return null
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
      ))}
    </svg>
  )
}
