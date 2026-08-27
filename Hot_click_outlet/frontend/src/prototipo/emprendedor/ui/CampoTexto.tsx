type Props = {
  etiqueta: string
  value: string
  onChange: (valor: string) => void
  type?: 'text' | 'password' | 'email' | 'number' | 'tel'
  placeholder?: string
  autoComplete?: string
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
        onChange={(evento) => onChange(evento.target.value)}
        className="min-h-11 w-full rounded-xl bg-[var(--hc-n-50)] px-3.5 py-3.5 text-sm font-medium text-hc-text outline-none placeholder:font-normal placeholder:text-hc-muted"
      />
    </label>
  )
}
