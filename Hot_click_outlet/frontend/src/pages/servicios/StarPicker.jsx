import { useState } from 'react'

export default function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  const STAR_PATH = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
          aria-label={`${s} estrella${s === 1 ? '' : 's'}`}
        >
          <svg className={`w-8 h-8 transition-colors duration-100 ${s <= active ? 'text-amber-400' : ''}`}
            viewBox="0 0 20 20"
            fill={s <= active ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={s <= active ? 0 : 1.5}
            style={{ color: s <= active ? '#fbbf24' : 'var(--hc-border)' }}>
            <path d={STAR_PATH} />
          </svg>
        </button>
      ))}
    </div>
  )
}
