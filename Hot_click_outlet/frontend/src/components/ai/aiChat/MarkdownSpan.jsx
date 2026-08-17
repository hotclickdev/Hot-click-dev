import { Fragment } from 'react'

export function MarkdownSpan({ text }) {
  const segments = text.split(/(\*\*[^*\n]+\*\*)/g)
  return (
    <Fragment>
      {segments.flatMap((seg, i) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return [<strong key={i} style={{ fontWeight: 700 }}>{seg.slice(2, -2)}</strong>]
        }
        return seg.split('\n').flatMap((line, j, arr) =>
          j < arr.length - 1 ? [line, <br key={`${i}-${j}`} />] : [line]
        )
      })}
    </Fragment>
  )
}
