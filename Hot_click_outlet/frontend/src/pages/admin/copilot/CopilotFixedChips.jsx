import { chipLabel, chipPrompt } from './copilotChatHelpers'

/** Chips fijos: clic envía el mensaje. */
export default function CopilotFixedChips({ chips, onPick, disabled, pills = false }) {
  if (!chips?.length) return null
  const className = pills
    ? 'text-[13px] px-4 py-2.5 min-h-[44px] rounded-full font-semibold hover:opacity-80 disabled:opacity-40'
    : 'text-xs px-3 py-2 min-h-[44px] rounded-xl hover:opacity-80 disabled:opacity-40'
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((s) => (
        <button type="button" key={chipLabel(s)} onClick={() => onPick(chipPrompt(s))} disabled={disabled}
          className={className}
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: pills ? '#1747A8' : 'var(--hc-text)' }}>
          {chipLabel(s)}
        </button>
      ))}
    </div>
  )
}
