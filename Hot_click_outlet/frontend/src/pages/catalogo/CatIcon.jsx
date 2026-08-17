import { catSvgIcon } from './catalogoHelpers'

export default function CatIcon({ name, className = 'w-3.5 h-3.5 shrink-0' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      {catSvgIcon(name)}
    </svg>
  )
}
