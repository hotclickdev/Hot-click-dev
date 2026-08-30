export const TOUR_CSS = `
  .hc-tour-active .hc-admin-sidebar a[aria-current="page"] {
    animation: hc-tour-glow 2s ease-in-out infinite !important;
  }
  @keyframes hc-tour-glow {
    0%, 100% { box-shadow: 0 0 0 2px rgba(23,71,168,.55), 0 0 18px rgba(23,71,168,.25); }
    50%       { box-shadow: 0 0 0 3px rgba(23,71,168,.4),  0 0 32px rgba(23,71,168,.45); }
  }
`
