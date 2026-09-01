type Props = {
  etiqueta: string
  value: string
  onChange: (valor: string) => void
  type?: 'text' | 'password' | 'email' | 'number' | 'tel'
  placeholder?: string
  autoComplete?: string
  readOnly?: boolean
}

/**
 * Campo de formulario Figma: label + input fondo neutro.
 */
export default function CampoTexto({
  etiqueta,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  readOnly = false,
}: Props) {
  const id = etiqueta.replaceAll(' ', '-').toLowerCase()
  return (
    <label className="flex w-full flex-col gap-2 text-xs font-medium text-hc-muted" htmlFor={id}>
      {etiqueta}
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        readOnly={readOnly}
        onChange={(evento) => onChange(evento.target.value)}
        className="min-h-11 w-full rounded-lg border border-hc-border bg-[#F8F9FB] px-3.5 py-3 text-sm font-normal text-hc-text outline-none placeholder:text-hc-muted"
      />
    </label>
  )
}
