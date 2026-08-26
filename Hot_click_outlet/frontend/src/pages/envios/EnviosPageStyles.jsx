const ENVIOS_CSS = `
        .envios-page { background: var(--hc-bg); min-height: 100vh; }

        /* Hero */
        .envios-hero {
          background: var(--hc-surface);
          border-bottom: 1px solid var(--hc-border);
          padding: 3rem 1.5rem 2.5rem;
          position: relative;
          overflow: hidden;
        }
        .envios-hero::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--hc-primary) 5%, transparent);
          pointer-events: none;
        }
        .envios-hero::after {
          content: '';
          position: absolute;
          bottom: -40px; left: 30%;
          width: 180px; height: 180px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--hc-accent) 5%, transparent);
          pointer-events: none;
        }
        .envios-hero-inner { max-width: 900px; margin: 0 auto; position: relative; }

        /* Eyebrow */
        .envios-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--hc-primary);
          background: color-mix(in srgb, var(--hc-primary) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--hc-primary) 18%, transparent);
          border-radius: 20px; padding: 4px 12px;
          margin-bottom: 1rem;
        }

        /* Headline */
        .envios-headline {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 900;
          color: var(--hc-text);
          margin: 0 0 0.35rem;
          line-height: 1.05;
          letter-spacing: -0.02em;
        }
        .envios-sub {
          font-size: 15px;
          color: var(--hc-muted);
          margin: 0 0 1.75rem;
        }

        /* Payment chips */
        .payment-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .payment-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 600;
          border-radius: 20px; padding: 5px 12px;
          border: 1.5px solid var(--hc-border);
          color: var(--hc-text);
          background: var(--hc-surface);
          position: relative;
        }
        .payment-chip.active {
          border-color: color-mix(in srgb, var(--hc-accent) 30%, transparent);
          color: var(--hc-accent);
          background: color-mix(in srgb, var(--hc-accent) 6%, transparent);
        }
        .payment-chip-tag {
          font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
          background: var(--hc-border); color: var(--hc-muted);
          border-radius: 10px; padding: 1px 6px; text-transform: uppercase;
        }

        /* Cards section */
        .envios-body { max-width: 900px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }

        .section-label {
          font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--hc-muted);
          margin: 0 0 1rem;
        }

        /* Service cards grid */
        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1rem;
          margin-bottom: 2.5rem;
        }

        .service-card {
          background: var(--hc-surface);
          border: 1.5px solid var(--hc-border);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex; flex-direction: column; gap: 0.75rem;
          position: relative;
          transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
        }
        .service-card.active:hover {
          border-color: color-mix(in srgb, var(--hc-accent) 40%, transparent);
          box-shadow: 0 4px 24px color-mix(in srgb, var(--hc-accent) 10%, transparent);
          transform: translateY(-2px);
        }
        .service-card.inactive {
          opacity: 0.65;
        }

        /* Card icon */
        .card-icon-wrap {
          width: 46px; height: 46px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          border: 1px solid;
        }

        /* Badge */
        .service-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; border-radius: 20px; padding: 3px 9px;
        }
        .badge-official {
          color: #16a34a;
          background: color-mix(in srgb, #16a34a 10%, transparent);
          border: 1px solid color-mix(in srgb, #16a34a 25%, transparent);
        }
        .badge-soon {
          color: var(--hc-muted);
          background: color-mix(in srgb, var(--hc-muted) 8%, transparent);
          border: 1px solid var(--hc-border);
        }
        .badge-prior {
          color: #d97706;
          background: color-mix(in srgb, #f59e0b 12%, transparent);
          border: 1px solid color-mix(in srgb, #f59e0b 28%, transparent);
        }

        .card-name { font-size: 15px; font-weight: 800; color: var(--hc-text); margin: 0; }
        .card-time { font-size: 12px; font-weight: 600; margin: 0; }
        .card-desc { font-size: 12px; color: var(--hc-muted); margin: 0; line-height: 1.5; }

        .card-divider {
          height: 1px;
          background: var(--hc-border);
          margin: 0 -1.25rem;
        }

        .card-price { font-size: 17px; font-weight: 900; color: var(--hc-text); margin: 0; }
        .card-price-sub { font-size: 10.5px; color: var(--hc-muted); margin: 2px 0 0; }
        .card-price-note {
          font-size: 10px; color: var(--hc-primary); font-weight: 600;
          background: color-mix(in srgb, var(--hc-primary) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--hc-primary) 18%, transparent);
          border-radius: 6px; padding: 2px 7px; display: inline-block; margin-top: 4px;
        }

        /* Payment row */
        .card-payment-row {
          display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
        }
        .card-payment-note {
          font-size: 10px; color: var(--hc-muted); font-weight: 600;
          margin-right: 4px;
        }
        .card-payment-chip {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10.5px; font-weight: 700;
          border-radius: 20px; padding: 3px 9px;
          background: color-mix(in srgb, var(--hc-accent) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--hc-accent) 22%, transparent);
          color: var(--hc-accent);
        }

        .card-cta {
          display: inline-flex; align-items: center;
          font-size: 12px; font-weight: 700;
          color: var(--hc-accent);
          background: color-mix(in srgb, var(--hc-accent) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent);
          border-radius: 8px; padding: 6px 12px;
          text-decoration: none; margin-top: auto;
          transition: background 0.15s;
        }
        .card-cta:hover { background: color-mix(in srgb, var(--hc-accent) 14%, transparent); }
        .card-cta-atajo {
          display: inline-flex; align-items: center;
          font-size: 12px; font-weight: 500;
          color: var(--hc-muted);
          text-decoration: none; margin-top: auto;
          min-height: 44px;
        }

        /* Urgent banner */
        .urgent-banner {
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; flex-wrap: wrap;
          background: color-mix(in srgb, var(--hc-primary) 5%, var(--hc-surface));
          border: 1.5px solid color-mix(in srgb, var(--hc-primary) 18%, transparent);
          border-radius: 16px; padding: 1.25rem 1.5rem;
          margin-bottom: 2.5rem;
        }
        .urgent-left { display: flex; align-items: center; gap: 12px; }
        .urgent-icon {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          background: color-mix(in srgb, var(--hc-primary) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--hc-primary) 20%, transparent);
          display: flex; align-items: center; justify-content: center;
          color: var(--hc-primary);
        }
        .urgent-title { font-size: 14px; font-weight: 800; color: var(--hc-text); margin: 0 0 2px; }
        .urgent-sub { font-size: 12px; color: var(--hc-muted); margin: 0; }

        /* FAQ */
        .faq-section { margin-bottom: 2.5rem; }
        .faq-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .faq-item {
          background: var(--hc-surface);
          border: 1.5px solid var(--hc-border);
          border-radius: 12px; padding: 1.1rem 1.25rem;
        }
        .faq-q { font-size: 13.5px; font-weight: 700; color: var(--hc-text); margin: 0 0 0.4rem; }
        .faq-a { font-size: 13px; color: var(--hc-muted); margin: 0; line-height: 1.65; }

        /* CTA footer */
        .envios-cta {
          background: color-mix(in srgb, var(--hc-accent) 6%, var(--hc-surface));
          border: 1.5px solid color-mix(in srgb, var(--hc-accent) 20%, transparent);
          border-radius: 16px; padding: 1.75rem;
          text-align: center;
        }
        .envios-cta p { font-size: 14px; color: var(--hc-muted); margin: 0 0 0.75rem; }
        .envios-cta a.wa {
          font-size: 13px; font-weight: 500; color: var(--hc-muted); text-decoration: none;
          display: block; margin: 0.75rem 0 1.25rem;
        }
        .envios-cta a.wa:hover { color: var(--hc-link); text-decoration: underline; }
        .envios-cta-links { display: flex; justify-content: center; gap: 1.25rem; flex-wrap: wrap; }
        .envios-cta-links a {
          font-size: 12.5px; color: var(--hc-muted); text-decoration: none;
          transition: color 0.15s;
        }
        .envios-cta-links a:hover { color: var(--hc-accent); }

        /* Back link */
        .back-link {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 13px; color: var(--hc-muted); text-decoration: none;
          margin-bottom: 1.5rem; transition: color 0.15s;
        }
        .back-link:hover { color: var(--hc-accent); }

        @media (max-width: 600px) {
          .services-grid { grid-template-columns: 1fr; }
          .urgent-banner { flex-direction: column; align-items: flex-start; }
        }
      `

export default function EnviosPageStyles() {
  return <style>{ENVIOS_CSS}</style>
}
