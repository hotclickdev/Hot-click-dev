import { useState, useRef, useCallback } from 'react'

export default function ImageUploadZone({ onFile }) {
  const inputRef = useRef()
  const [drag, setDrag] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) onFile(file)
  }, [onFile])

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`
        w-full border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200
        ${drag
          ? 'border-[#4f7cff] bg-[#4f7cff]/5'
          : 'border-white/15 hover:border-[#4f7cff]/50 hover:bg-white/3'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
      <svg className="w-10 h-10 mx-auto mb-3 text-[#4f7cff]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="text-sm font-medium text-[#e8e8ed]">Arrastra la foto del producto aquí</p>
      <p className="text-xs text-[#8e8e9a] mt-1">o haz clic para seleccionar · JPG, PNG, WEBP</p>
    </button>
  )
}
