import { chipLabel, chipPrompt } from './copilotChatHelpers'

/** Chips fijos: clic envía el mensaje. */
export default function CopilotFixedChips({ chips, onPick, disabled }) {
  if (!chips?.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((s) => (
        <button type="button" key={chipLabel(s)} onClick={() => onPick(chipPrompt(s))} disabled={disabled}
          className="text-xs px-3 py-2 min-h-[44px] rounded-xl hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
          {chipLabel(s)}
        </button>
      ))}
    </div>
  )
}
