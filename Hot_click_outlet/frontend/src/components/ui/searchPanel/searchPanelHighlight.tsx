import type { ReactNode } from 'react'

export function highlight(text: string | null | undefined, query: string): ReactNode {
  if (!text || !query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <strong className="text-[#4f7cff] font-semibold">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  )
}
