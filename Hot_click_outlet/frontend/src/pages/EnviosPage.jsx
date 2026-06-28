import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'

const SITE_URL = 'https://hotclick.lat'
const LAST_UPDATED = '21 de junio de 2026'

const shippingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Logística HotClick — Envíos a todo Costa Rica',
  description: 'Información completa sobre envíos a todo Costa Rica: tiempos de entrega, couriers, costos y zonas de cobertura.',
  url: `${SITE_URL}/envios`,
  inLanguage: 'es-CR',
  isPartOf: { '@type': 'WebSite', name: 'HotClick', url: SITE_URL },
}

const services = [
  {
    id: 'rapido',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    name: 'Envío Rápido',
    badge: 'Próximamente',
    badgeType: 'soon',
    time: '30 min – 2 horas',
    desc: 'Mensajero en moto directo a tu puerta dentro del Gran Área Metropolitana. Pago previo requerido.',
    price: null,
    priceSub: null,
    payment: [{ label: 'SINPE Móvil', Icon: IconPhone }],
    active: false,
    color: '#f59e0b',
  },
  {
    id: 'normal-gam',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    name: 'Envío Normal — GAM',
    badge: 'Servicio oficial',
    badgeType: 'official',
    time: '2–4 días hábiles',
    desc: 'Correos de Costa Rica a San José, Heredia, Alajuela y Cartago. Número de rastreo incluido.',
    price: '~₡4,000',
    priceSub: 'Estimado · puede variar',
    payment: [{ label: 'SINPE Móvil', Icon: IconPhone }, { label: 'Efectivo', Icon: IconCash }],
    paymentNote: 'Contra entrega',
    active: true,
    color: 'var(--hc-accent)',
  },
  {
    id: 'fuera-gam',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    name: 'Fuera de la GAM',
    badge: 'Servicio oficial',
    badgeType: 'official',
    time: '3–4 días hábiles',
    desc: 'Correos de Costa Rica a Guanacaste, Puntarenas, Limón y zonas rurales. Rastreo incluido.',
    price: '~₡4,000',
    priceSub: 'Estimado · puede variar',
    payment: [{ label: 'SINPE Móvil', Icon: IconPhone }, { label: 'Efectivo', Icon: IconCash }],
    paymentNote: 'Contra entrega',
    active: true,
    color: 'var(--hc-accent)',
  },
  {
    id: 'encomienda',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    name: 'Tu encomienda',
    badge: 'Próximamente',
    badgeType: 'soon',
    time: 'Según tu mensajero',
    desc: 'Coordinamos con el mensajero que vos elegís. HOTCLICK cubre la gestión; la tarifa del courier va aparte.',
    price: '₡2,500 + tarifa encomienda',
    priceSub: 'Costo HOTCLICK · tarifa del courier aparte',
    payment: [{ label: 'SINPE Móvil', Icon: IconPhone }],
    active: false,
    color: '#8b5cf6',
  },
  {
    id: 'internacional',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.115 5.19l.319 1.913A6 6 0 008.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 002.288-4.042 1.087 1.087 0 00-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 01-.98-.314l-.295-.295a1.125 1.125 0 010-1.591l.13-.132a1.125 1.125 0 011.3-.21l.603.302a.809.809 0 001.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 001.528-1.732l.146-.292M6.115 5.19A9 9 0 1017.18 4.64M6.115 5.19A8.965 8.965 0 0112 3c1.929 0 3.716.607 5.18 1.64" />
      </svg>
    ),
    name: 'Internacional',
    badge: 'Servicio oficial',
    badgeType: 'official',
    time: 'A coordinar',
    desc: 'Enviamos a cualquier país. Tiempo y costo se coordinan directamente según destino y peso.',
    price: 'Consultar',
    priceSub: null,
    payment: [{ label: 'SINPE Móvil', Icon: IconPhone }],
    active: true,
    color: 'var(--hc-accent)',
    cta: { label: 'WhatsApp →', href: 'https://wa.me/50686667888?text=Hola,%20me%20interesa%20un%20envío%20internacional' },
  },
]

const IconPhone = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 15.75h3" />
  </svg>
)
const IconCash = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
)
const IconCard = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
)

const paymentMethods = [
  { label: 'SINPE Móvil', Icon: IconPhone, active: true },
  { label: 'Efectivo', Icon: IconCash, active: true },
  { label: 'Tarjeta', Icon: IconCard, active: false, tag: 'próximo' },
]

const faqItems = [
  {
    q: '¿Los precios mostrados son exactos?',
    a: 'Los precios son estimados y pueden variar según el peso, dimensiones y destino exacto del paquete. El costo final se confirma al momento de procesar el pedido.',
  },
  {
    q: '¿Cómo puedo rastrear mi pedido?',
    a: 'Ingresá a "Mis Pedidos" para ver el estado en tiempo real. Si tu envío es por Correos de Costa Rica, recibirás un número de guía para rastrear en correos.go.cr.',
  },
  {
    q: '¿Qué pasa si hay algún problema con mi envío?',
    a: 'Escribinos a hotclick.cr@gmail.com con el número de pedido. También podés consultar nuestra Política de Devoluciones.',
  },
  {
    q: '¿Cubren toda Costa Rica?',
    a: 'Sí. Los envíos oficiales por Correos de Costa Rica cubren todo el territorio nacional, incluyendo zonas rurales y costeras.',
  },
]

export default function EnviosPage() {
  return (
    <MainLayout>
      <Helmet>
        <title>Envíos a todo Costa Rica — HotClick</title>
        <meta name="description" content="Enviamos a todas las provincias de Costa Rica. Conocé los métodos de envío, tarifas estimadas y zonas de cobertura de HotClick." />
        <link rel="canonical" href={`${SITE_URL}/envios`} />
        <script type="application/ld+json">{JSON.stringify(shippingJsonLd)}</script>
      </Helmet>

      <style>{`
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
        .urgent-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: #25d366; color: #fff;
          font-size: 13px; font-weight: 700;
          border-radius: 10px; padding: 9px 18px;
          text-decoration: none; white-space: nowrap;
          transition: opacity 0.15s;
          flex-shrink: 0;
        }
        .urgent-btn:hover { opacity: 0.88; }

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
        .envios-cta p { font-size: 14px; color: var(--hc-muted); margin: 0 0 0.5rem; }
        .envios-cta a.wa {
          font-size: 16px; font-weight: 800; color: var(--hc-accent); text-decoration: none;
          display: block; margin-bottom: 1.25rem;
        }
        .envios-cta a.wa:hover { text-decoration: underline; }
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
      `}</style>

      <div className="envios-page">
        {/* Hero */}
        <div className="envios-hero">
          <div className="envios-hero-inner">
            <Link to="/" className="back-link">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Volver al inicio
            </Link>

            <div className="envios-eyebrow">
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              Logística HotClick
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 className="envios-headline">Enviamos a todo el país.</h1>
                <p className="envios-sub">Elegí la opción que mejor se adapte a vos.</p>
              </div>
              <div className="payment-chips" style={{ paddingTop: 4 }}>
                {paymentMethods.map(m => (
                  <span key={m.label} className={`payment-chip${m.active ? ' active' : ''}`}>
                    <m.Icon /> {m.label}
                    {m.tag && <span className="payment-chip-tag">{m.tag}</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="envios-body">

          {/* Service cards */}
          <p className="section-label">Opciones de envío</p>
          <div className="services-grid">
            {services.map(s => (
              <div key={s.id} className={`service-card${s.active ? ' active' : ' inactive'}`}>
                {/* Top row: icon + badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div
                    className="card-icon-wrap"
                    style={{
                      color: s.active ? s.color : 'var(--hc-muted)',
                      background: `color-mix(in srgb, ${s.active ? s.color : 'var(--hc-muted)'} 10%, transparent)`,
                      borderColor: `color-mix(in srgb, ${s.active ? s.color : 'var(--hc-muted)'} 20%, transparent)`,
                    }}
                  >
                    {s.icon}
                  </div>
                  <span className={`service-badge ${s.badgeType === 'official' ? 'badge-official' : 'badge-soon'}`}>
                    {s.badgeType === 'official' ? (
                      <svg width="9" height="9" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg width="9" height="9" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                      </svg>
                    )}
                    {s.badge}
                  </span>
                </div>

                {/* Name + time + desc */}
                <div>
                  <p className="card-name">{s.name}</p>
                  <p className="card-time" style={{ color: s.active ? s.color : 'var(--hc-muted)' }}>{s.time}</p>
                  <p className="card-desc">{s.desc}</p>
                </div>

                {/* Divider */}
                <div className="card-divider" />

                {/* Price */}
                {s.price && (
                  <div>
                    <p className="card-price">{s.price}</p>
                    {s.priceSub && <p className="card-price-sub">{s.priceSub}</p>}
                    {s.id === 'encomienda' && (
                      <span className="card-price-note">+ tarifa del mensajero</span>
                    )}
                    {(s.id === 'normal-gam' || s.id === 'fuera-gam') && (
                      <span className="card-price-note">Precio estimado — puede variar</span>
                    )}
                  </div>
                )}

                {/* Payment methods */}
                {s.payment && (
                  <div className="card-payment-row">
                    {s.paymentNote && (
                      <span className="card-payment-note">{s.paymentNote}:</span>
                    )}
                    {s.payment.map(p => (
                      <span key={p.label} className="card-payment-chip">
                        <p.Icon /> {p.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* CTA */}
                {s.cta && s.active && (
                  <a href={s.cta.href} target="_blank" rel="noopener noreferrer" className="card-cta">
                    {s.cta.label}
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Urgent banner */}
          <div className="urgent-banner">
            <div className="urgent-left">
              <div className="urgent-icon">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <div>
                <p className="urgent-title">¿Necesitás algo urgente?</p>
                <p className="urgent-sub">Coordinamos tu envío directamente por WhatsApp</p>
              </div>
            </div>
            <a
              href="https://wa.me/50686667888?text=Hola,%20necesito%20un%20envío%20urgente"
              target="_blank"
              rel="noopener noreferrer"
              className="urgent-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Escribinos por WhatsApp
            </a>
          </div>

          {/* FAQ */}
          <div className="faq-section">
            <p className="section-label">Preguntas frecuentes</p>
            <div className="faq-grid">
              {faqItems.map((item, i) => {
                let answer = item.a
                if (item.q.includes('rastrear')) {
                  answer = (
                    <>
                      Ingresá a{' '}
                      <Link to="/mis-pedidos" style={{ color: 'var(--hc-accent)' }}>Mis Pedidos</Link>{' '}
                      para ver el estado en tiempo real. Si tu envío es por Correos de Costa Rica, recibirás un número de guía para rastrear en{' '}
                      <a href="https://www.correos.go.cr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hc-accent)' }}>correos.go.cr</a>.
                    </>
                  )
                } else if (item.q.includes('problema')) {
                  answer = (
                    <>
                      Escribinos a{' '}
                      <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a>{' '}
                      con el número de pedido. También podés consultar nuestra{' '}
                      <Link to="/devoluciones" style={{ color: 'var(--hc-accent)' }}>Política de Devoluciones</Link>.
                    </>
                  )
                }
                return (
                <div key={i} className="faq-item">
                  <p className="faq-q">{item.q}</p>
                  <p className="faq-a">{answer}</p>
                </div>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="envios-cta">
            <p>¿Preguntas sobre tu envío?</p>
            <a href="https://wa.me/50686667888" target="_blank" rel="noopener noreferrer" className="wa">
              Escribinos por WhatsApp →
            </a>
            <div className="envios-cta-links">
              <Link to="/devoluciones">Política de Devoluciones →</Link>
              <Link to="/mis-pedidos">Rastrear mi pedido →</Link>
              <Link to="/contacto">Contacto →</Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
