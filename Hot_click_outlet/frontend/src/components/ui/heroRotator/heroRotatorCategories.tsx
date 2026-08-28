import type { ReactNode } from 'react'

export type HeroCategoria = {
  label: string
  query: string
  grad: string
  iconColor: string
  icon: ReactNode
}

export const CATEGORIAS: HeroCategoria[] = [
  {
    label: 'Sala',
    query: 'sala',
    grad: 'linear-gradient(145deg, #f5ede0, #e2c9a8)',
    iconColor: '#c07a45',
    icon: (
      <svg viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-7">
        <rect x="1" y="10" width="38" height="14" rx="4" fill="currentColor" opacity=".18"/>
        <rect x="5" y="14" width="30" height="10" rx="3" fill="currentColor" opacity=".55"/>
        <rect x="1" y="12" width="7" height="12" rx="3" fill="currentColor" opacity=".75"/>
        <rect x="32" y="12" width="7" height="12" rx="3" fill="currentColor" opacity=".75"/>
        <rect x="10" y="22" width="5" height="5" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="25" y="22" width="5" height="5" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="8" y="2" width="24" height="10" rx="3" fill="currentColor" opacity=".3"/>
      </svg>
    ),
  },
  {
    label: 'Cocina',
    query: 'cocina',
    grad: 'linear-gradient(145deg, #e6f5ec, #b8e0c8)',
    iconColor: '#3a9669',
    icon: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <circle cx="18" cy="16" r="11" fill="currentColor" opacity=".18"/>
        <ellipse cx="18" cy="15" rx="9" ry="9" fill="none" stroke="currentColor" strokeWidth="2.2" opacity=".7"/>
        <line x1="18" y1="4" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".9"/>
        <rect x="14" y="26" width="8" height="5" rx="2" fill="currentColor" opacity=".5"/>
        <line x1="10" y1="4" x2="10" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5"/>
        <line x1="26" y1="4" x2="26" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5"/>
      </svg>
    ),
  },
  {
    label: 'Dormitorio',
    query: 'dormitorio',
    grad: 'linear-gradient(145deg, #ede8f5, #cfc2e8)',
    iconColor: '#7b5ea7',
    icon: (
      <svg viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-7">
        <rect x="2" y="14" width="36" height="12" rx="3" fill="currentColor" opacity=".18"/>
        <rect x="4" y="16" width="32" height="10" rx="2.5" fill="currentColor" opacity=".5"/>
        <rect x="4" y="9" width="14" height="9" rx="3" fill="currentColor" opacity=".6"/>
        <rect x="22" y="9" width="14" height="9" rx="3" fill="currentColor" opacity=".6"/>
        <rect x="2" y="22" width="3" height="6" rx="1.5" fill="currentColor" opacity=".7"/>
        <rect x="35" y="22" width="3" height="6" rx="1.5" fill="currentColor" opacity=".7"/>
        <rect x="2" y="12" width="4" height="12" rx="2" fill="currentColor" opacity=".4"/>
      </svg>
    ),
  },
  {
    label: 'Oficina',
    query: 'oficina',
    grad: 'linear-gradient(145deg, #e3edf9, #b8d0f0)',
    iconColor: '#3a72c4',
    icon: (
      <svg viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-9">
        <rect x="4" y="4" width="30" height="20" rx="3" fill="currentColor" opacity=".18"/>
        <rect x="6" y="6" width="26" height="16" rx="2" fill="currentColor" opacity=".55"/>
        <rect x="8" y="9" width="22" height="10" rx="1.5" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="0"/>
        <rect x="16" y="24" width="6" height="4" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="10" y="28" width="18" height="2.5" rx="1.25" fill="currentColor" opacity=".4"/>
        <circle cx="19" cy="14" r="3" fill="currentColor" opacity=".35"/>
      </svg>
    ),
  },
  {
    label: 'Jardín',
    query: 'jardin',
    grad: 'linear-gradient(145deg, #ecf7e5, #c5e8a8)',
    iconColor: '#4a8c2a',
    icon: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <ellipse cx="18" cy="14" rx="11" ry="11" fill="currentColor" opacity=".18"/>
        <path d="M18 24 C18 24 8 18 10 9 C12 4 18 2 18 2 C18 2 24 4 26 9 C28 18 18 24 18 24Z" fill="currentColor" opacity=".6"/>
        <path d="M18 24 C18 24 10 20 14 12 C16 8 18 6 18 6 C18 6 20 8 22 12 C26 20 18 24 18 24Z" fill="currentColor" opacity=".35"/>
        <line x1="18" y1="24" x2="18" y2="34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".7"/>
      </svg>
    ),
  },
  {
    label: 'Regalo',
    query: 'regalo',
    grad: 'linear-gradient(145deg, #fce8ee, #f5baca)',
    iconColor: '#c4476a',
    icon: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <rect x="4" y="14" width="28" height="18" rx="2.5" fill="currentColor" opacity=".18"/>
        <rect x="5" y="15" width="26" height="17" rx="2" fill="currentColor" opacity=".45"/>
        <rect x="3" y="9" width="30" height="7" rx="2.5" fill="currentColor" opacity=".6"/>
        <line x1="18" y1="9" x2="18" y2="32" stroke="currentColor" strokeWidth="2.5" opacity=".5"/>
        <path d="M18 9 C18 9 14 6 12 8 C10 10 14 12 18 9Z" fill="currentColor" opacity=".7"/>
        <path d="M18 9 C18 9 22 6 24 8 C26 10 22 12 18 9Z" fill="currentColor" opacity=".7"/>
      </svg>
    ),
  },
]
