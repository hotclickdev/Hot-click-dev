import { InboxIcon } from './empresasIcons'

export default function TabEmpty({ text }: { text: string }) {
  return (
    <div className="py-12 text-center">
      <InboxIcon />
      <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{text}</p>
    </div>
  )
}
