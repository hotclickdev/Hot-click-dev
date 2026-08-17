import { useState } from 'react'
import TestimonioForm from './TestimonioForm'
import ResenaForm from './ResenaForm'

export default function OpinionesSection({ orders = [], ordersLoading = false }) {
  const [tab, setTab] = useState('testimonio')

  const tabStyle = (active) => ({
    flex: 1,
    padding: '8px 0',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '10px',
    transition: 'all 0.15s',
    backgroundColor: active ? 'var(--hc-accent)' : 'transparent',
    color: active ? '#fff' : 'var(--hc-muted)',
    border: 'none',
    cursor: 'pointer',
  })

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}>

      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--hc-border)' }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--hc-text)' }}>
          ⭐ Tu opinión
        </h2>
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
          <button style={tabStyle(tab === 'testimonio')} onClick={() => setTab('testimonio')}>
            💬 Testimonio web
          </button>
          <button style={tabStyle(tab === 'resena')} onClick={() => setTab('resena')}>
            📦 Reseña de producto
          </button>
        </div>
      </div>

      {tab === 'testimonio'
        ? <TestimonioForm />
        : <ResenaForm orders={orders} ordersLoading={ordersLoading} />
      }
    </div>
  )
}
