# HOTCLICK — Sistema de Diseño Frontend

> Versión: 1.0 | 2026-05-18 | Stack: React 19 · Tailwind v4 · Framer Motion 12 · Vite 8

---

## 1. Arquitectura del Frontend

```
Hot_click_outlet/frontend/src/
├── App.jsx                    ← Router principal + guards
├── index.css                  ← Sistema de diseño (variables, clases, animaciones)
├── hooks/
│   └── useScrollReveal.js     ← IntersectionObserver para scroll reveal
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx         ← Sticky con scroll progress + height shrink
│   │   ├── Footer.jsx         ← Logo premium + links con underline animado
│   │   └── BottomNav.jsx      ← Navegación móvil con layoutId indicator
│   └── ui/
│       ├── Button.jsx         ← Componente con framer-motion (whileHover/Tap)
│       ├── Input.jsx          ← Con label, icon, error, hint
│       ├── Modal.jsx
│       ├── Toast.jsx          ← Context API + AnimatePresence
│       ├── Badge.jsx
│       ├── Spinner.jsx
│       ├── ThemeToggle.jsx
│       ├── AccessibilityPanel.jsx
│       ├── WhatsAppFab.jsx
│       ├── LanguageSelector.jsx
│       └── MultiImagePicker.jsx
├── layouts/
│   ├── MainLayout.jsx         ← Navbar + main (page transition) + Footer + BottomNav
│   ├── AuthLayout.jsx         ← Centrado vertical para Login/Register
│   └── AdminLayout.jsx        ← Sidebar + contenido
├── pages/
│   ├── HomePage.jsx
│   ├── ProductsPage.jsx
│   ├── ProductDetailPage.jsx
│   ├── CartPage.jsx
│   ├── CheckoutPage.jsx
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── ProfilePage.jsx
│   ├── MisPedidosPage.jsx
│   ├── NosotrosPage.jsx
│   ├── ContactoPage.jsx
│   ├── InformacionPage.jsx
│   ├── PaymentStatusPage.jsx
│   └── admin/                 ← 12 páginas del panel admin
├── services/                  ← Axios + servicios por dominio
├── store/                     ← Zustand (authStore, cartStore, uiStore)
├── i18n/                      ← i18next (ES, EN, PT)
└── utils/format.js
```

---

## 2. Sistema de Tokens (CSS Variables)

Definidos en `index.css`. Todos los componentes deben usar estas variables, **nunca colores hardcodeados**.

### Paleta Light Mode (`:root`)

| Variable | Valor | Uso |
|---|---|---|
| `--hc-bg` | `#ede5da` | Fondo de página |
| `--hc-surface` | `#faf7f3` | Cards, navbar, footer |
| `--hc-surface-2` | `#e2d8e8` | Hover states, inputs |
| `--hc-border` | `rgba(154,132,188,0.20)` | Bordes sutiles |
| `--hc-border-strong` | `rgba(154,132,188,0.38)` | Bordes hover |
| `--hc-text` | `#2a1f3a` | Texto principal |
| `--hc-muted` | `#5e4f72` | Texto secundario |
| `--hc-accent` | `#9a84bc` | Púrpura lavanda (color de marca) |
| `--hc-accent-hover` | `#7c66a0` | Accent hover |
| `--hc-success` | `#059669` | Estado éxito |
| `--hc-danger` | `#dc2626` | Estado error |
| `--hc-warning` | `#d97706` | Estado advertencia |
| `--hc-shadow` | `rgba(154,132,188,0.18)` | Sombras |
| `--hc-glass-bg` | `rgba(174,205,209,0.15)` | Fondo glassmorphism |
| `--hc-glass-border` | `rgba(154,132,188,0.18)` | Borde glassmorphism |

### Paleta Dark Mode (`html.dark`)

| Variable | Valor |
|---|---|
| `--hc-bg` | `#07071a` |
| `--hc-surface` | `#0e0b2e` |
| `--hc-surface-2` | `#17123f` |
| `--hc-accent` | `#9333ea` (púrpura intenso) |
| `--hc-text` | `#f0ecff` |
| `--hc-muted` | `#c4b5fd` |
| `--hc-glass-bg` | `rgba(147,51,234,0.05)` |

### Radios

| Variable | Valor | Uso |
|---|---|---|
| `--radius-sm` | `8px` | Chips, badges |
| `--radius-md` | `12px` | Inputs |
| `--radius-lg` | `16px` | Cards |
| `--radius-xl` | `24px` | Modales, drawers |

---

## 3. Sistema de Botones

Clases en `index.css` — usar en lugar de Tailwind hardcodeado.

### Variantes

```jsx
// Primario — fondo accent, sombra glow
<button className="hc-btn hc-btn-primary">Agregar al carrito</button>

// Ghost — fondo translúcido, texto accent → fill en hover
<button className="hc-btn hc-btn-ghost">Ver más</button>

// Outline — borde sutil, texto normal
<button className="hc-btn hc-btn-outline">Cancelar</button>
```

### Tamaños

```jsx
<button className="hc-btn hc-btn-primary hc-btn-sm">  {/* h-8, px-3.5, text-xs */}
<button className="hc-btn hc-btn-primary">            {/* h-10.5, px-5.5, text-sm (default) */}
<button className="hc-btn hc-btn-primary hc-btn-lg">  {/* h-13, px-8, text-base */}
```

### Características automáticas (en `.hc-btn`)

- **Shimmer**: brillo que cruza el botón en hover (`::before` + translate)
- **Active**: `scale(0.96)` en click
- **Hover**: `translateY(-2px)` + sombra glow en primario
- **`reduce-motion`**: desactiva todas las transiciones si está activo

### Componente `Button.jsx` (usa `motion.button`)

```jsx
import Button from '@/components/ui/Button'

// Variantes: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
// Tamaños: 'sm' | 'md' | 'lg' | 'xl'
<Button variant="primary" size="lg" loading={isLoading} icon={<Icon />}>
  Confirmar pedido
</Button>
```

---

## 4. Sistema de Cards

```jsx
// Card básica — elevación en hover
<div className="hc-card">...</div>

// Card con glow accent en hover
<div className="hc-card hc-card-glow">...</div>

// Card con línea accent arriba en hover
<div className="hc-card hc-card-accent-line">...</div>

// Glassmorphism — backdrop-filter blur(24px)
<div className="hc-glass-card">...</div>

// Step card (hover sube 6px + sombra profunda + glow en icono)
<div className="hc-step-card">
  <div className="hc-step-icon">...</div>  {/* recibe glow automático */}
</div>
```

### Cuándo usar cada variante

| Variante | Usar en |
|---|---|
| `hc-card` | Cards de admin, sidebar, listas |
| `hc-card hc-card-glow` | Producto cards, cards interactivas |
| `hc-glass-card` | Testimonios, features, secciones sobre fondo |
| `hc-step-card` | Steps "Cómo comprar", procesos de pasos |

---

## 5. Sistema de Inputs

```jsx
// Clase CSS directa
<input className="hc-input" placeholder="..." />

// Con icono a la izquierda
<div className="relative">
  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" ... />
  <input className="hc-input pl-10" />
</div>

// Componente Input.jsx
import Input from '@/components/ui/Input'

<Input
  label="Correo"
  type="email"
  icon={<EmailIcon />}
  error="Correo inválido"
  hint="Usaremos esto para enviarte el recibo"
  placeholder="tu@email.com"
/>
```

`.hc-input` incluye: background surface, border sutil, focus ring con glow accent, placeholder muted.

---

## 6. Sistema de Badges

```jsx
// Badge de acento (pill)
<span className="hc-badge">Nuevo</span>

// Badge custom con Tailwind
<span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
  style={{ background: 'color-mix(in srgb, var(--hc-accent) 15%, transparent)', color: 'var(--hc-accent)' }}>
  Destacado
</span>
```

---

## 7. Glassmorphism

```jsx
// Básico (20px blur)
<div className="glass">...</div>

// Fuerte (32px blur)
<div className="glass-strong">...</div>

// Diseñado para cards interactivas
<div className="hc-glass-card">...</div>
```

**Light mode override**: `.hc-glass-card` en light mode usa `rgba(250,247,243,0.55)` en lugar del glass translúcido para mayor legibilidad.

---

## 8. Tipografía

```jsx
// Gradiente de texto (text → muted)
<span className="text-gradient">Título</span>

// Gradiente accent animado (azul → púrpura → loop)
<span className="text-gradient-accent">HOTCLICK</span>

// Usar variables directas
<h1 style={{ color: 'var(--hc-text)' }}>Título</h1>
<p style={{ color: 'var(--hc-muted)' }}>Subtítulo</p>
```

Font: **Inter** (sistema fallback: `system-ui, -apple-system`).
Barlow 900 solo para el logotipo HOTCLICK.

---

## 9. Sistema de Animaciones

### Keyframes CSS disponibles

| Clase | Animación | Duración | Uso |
|---|---|---|---|
| `hc-float` | Flotación suave ±12px + rotación | 5s loop | Ilustraciones en hero |
| `hc-float-b` | Flotación suave ±14px | 6.5s loop | Ilustraciones alternativas |
| `hc-slide-up` | Entrada desde abajo (20px) | 0.4s once | Títulos |
| `hc-scale-in` | Escala desde 0.92 | 0.35s once | Modales, dropdowns |
| `hc-glow-breathe` | Sombra pulsante accent | 2.5s loop | CTAs, elementos destacados |
| `hc-shimmer-load` | Shimmer de skeleton | 1.6s loop | Carga de contenido |
| `hc-gradient-shift` | Desplazamiento de gradiente | 5s loop | `.text-gradient-accent` |

### Framer Motion — Patrones estándar

```jsx
// Entrada básica
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
>

// Entrada en viewport (una sola vez)
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.45 }}
>

// Stagger de lista (contenedor + items)
const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } },
}

<motion.ul variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true }}>
  {items.map(item => (
    <motion.li key={item.id} variants={stagger.item}>...</motion.li>
  ))}
</motion.ul>

// Page transition (en MainLayout.jsx)
<motion.main
  initial={{ opacity: 0, y: 12, scale: 0.995 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
>
```

---

## 10. Sistema Scroll Reveal

Para secciones que no necesitan animaciones complejas de Framer. Usa `IntersectionObserver` puro — más ligero.

### Hook `useScrollReveal`

```jsx
import { useScrollReveal } from '@/hooks/useScrollReveal'

function MiSeccion() {
  const ref = useScrollReveal()           // threshold 0.12 por defecto
  const ref2 = useScrollReveal({ threshold: 0.08, rootMargin: '0px 0px -60px 0px' })

  return (
    <section ref={ref} className="hc-reveal">
      Aparece al scrollear
    </section>
  )
}
```

### Clases CSS

```jsx
// Fade + slide up (28px)
<div className="hc-reveal">...</div>

// Scale desde 0.95
<div className="hc-reveal-scale">...</div>

// Con retraso (para stagger manual)
<div className="hc-reveal hc-delay-1">...</div>  {/* +80ms */}
<div className="hc-reveal hc-delay-2">...</div>  {/* +160ms */}
<div className="hc-reveal hc-delay-3">...</div>  {/* +240ms */}
<div className="hc-reveal hc-delay-4">...</div>  {/* +320ms */}
```

El hook añade `.hc-revealed` cuando el elemento entra al viewport, lo que activa la transición CSS. Respeta `html.reduce-motion`.

---

## 11. Navbar — Comportamiento Scroll

`Navbar.jsx` tiene dos comportamientos al hacer scroll:

1. **Height shrink**: `h-16` (64px) → `h-14` (56px) cuando `scrollY > 20px`
2. **Scroll progress bar**: `.hc-progress` que crece de 0 a 100% del ancho según la posición en la página

```jsx
// La barra de progreso usa CSS
.hc-progress {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 2px;
  transform-origin: 0% 50%;
  /* scaleX controlado por JS */
}

// Estado en Navbar.jsx
const [scrollProgress, setScrollProgress] = useState(0)
// scaleX = scrollProgress (0..1)
```

---

## 12. Links con Underline Animado

```jsx
<Link className="hc-underline-hover" style={{ color: 'var(--hc-muted)' }}>
  Ver productos
</Link>
```

`.hc-underline-hover` añade un `::after` con `scaleX(0) → scaleX(1)` en hover desde la izquierda.

---

## 13. Sombras

```jsx
// Multi-capa con CSS variables (adapta a light/dark)
<div className="hc-shadow-premium">...</div>

// Inline para control preciso
style={{ boxShadow: '0 8px 32px color-mix(in srgb, var(--hc-shadow) 30%, transparent)' }}
```

---

## 14. Accesibilidad

El sistema respeta automáticamente:

- **`html.reduce-motion`**: todas las `animation-duration` y `transition-duration` pasan a `0.001ms`
- **`html.high-contrast`**: bordes más pronunciados, texto más oscuro
- **`html.fs-lg`** / **`html.fs-xl`**: aumenta `font-size` del html raíz
- **`html.dark`**: paleta navy/purple completa

El `AccessibilityPanel.jsx` controla estos toggles y persiste en `uiStore` (Zustand → localStorage).

---

## 15. Temas en Componentes

**Regla principal**: usar `style={{ color: 'var(--hc-text)' }}` en lugar de `text-[#e8e8ed]`.

El archivo `index.css` tiene un sistema de overrides para light mode que mapea clases Tailwind hardcodeadas a variables CSS. Sin embargo, la práctica recomendada para componentes nuevos es usar variables directamente:

```jsx
// ❌ Evitar (requiere override CSS)
<p className="text-[#8e8e9a]">Texto muted</p>

// ✅ Preferir (auto-adapta al tema)
<p style={{ color: 'var(--hc-muted)' }}>Texto muted</p>

// ✅ También válido con variables CSS en Tailwind v4
<p className="text-[var(--hc-muted)]">Texto muted</p>
```

---

## 16. Patrones de Página

### Página pública estándar

```jsx
export default function MiPagina() {
  const ref = useScrollReveal()

  return (
    <MainLayout>
      {/* Hero o header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
          <h1 style={{ color: 'var(--hc-text)' }}>Título</h1>
        </motion.div>
      </section>

      {/* Secciones de contenido con scroll reveal */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div ref={ref} className="hc-reveal">
          Contenido
        </div>
      </section>
    </MainLayout>
  )
}
```

### Card de producto

```jsx
<motion.div
  whileHover={{ y: -4 }}
  className="hc-card hc-card-glow rounded-2xl overflow-hidden cursor-pointer"
>
  <div className="hc-product-img h-44">
    <img src={url} className="w-full h-full object-cover" loading="lazy" />
  </div>
  <div className="p-4">
    <h3 style={{ color: 'var(--hc-text)' }}>Nombre</h3>
    <p style={{ color: 'var(--hc-muted)' }}>Precio</p>
    <button className="hc-btn hc-btn-ghost w-full mt-3">Agregar</button>
  </div>
</motion.div>
```

### Formulario auth

```jsx
<motion.div
  initial={{ opacity: 0, y: 20, scale: 0.98 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
  className="rounded-2xl overflow-hidden"
  style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
>
  {/* Línea accent superior */}
  <div className="h-0.5"
    style={{ background: 'linear-gradient(90deg, transparent, var(--hc-accent), transparent)' }} />
  <div className="p-8">
    <form className="space-y-4">
      <Input label="Correo" type="email" />
      <Button type="submit" className="w-full" size="lg">Ingresar</Button>
    </form>
  </div>
</motion.div>
```

---

## 17. Performance

### Hints de GPU

```jsx
// Para elementos con animaciones frecuentes (parallax, float)
<div className="hc-animate-gpu">...</div>
// Aplica: will-change: transform; transform: translateZ(0)
```

### Code splitting (Vite)

El `vite.config.js` separa los chunks por vendor:

| Chunk | Contenido |
|---|---|
| `vendor-motion` | framer-motion |
| `vendor-react` | react, react-dom, react-router-dom |
| `vendor-query` | @tanstack/react-query |
| `vendor-misc` | zustand, i18next, axios |

Cada página es un chunk separado (lazy loading automático en `App.jsx`).

### Imágenes

```jsx
// Siempre usar loading="lazy" en imágenes fuera del fold
<img src={url} alt={nombre} loading="lazy" />
```

---

## 18. Convenciones de Nomenclatura

| Prefijo | Uso |
|---|---|
| `hc-btn*` | Botones |
| `hc-card*` | Cards |
| `hc-input` | Inputs |
| `hc-badge` | Badges/pills |
| `hc-nav-*` | Navbar elementos |
| `hc-glass*` | Glassmorphism |
| `hc-reveal*` | Scroll reveal |
| `hc-shadow*` | Sombras |
| `hc-float*` | Animaciones de flotación |
| `hc-skeleton` | Loading skeletons |
| `hc-logo-*` | Logo badge + texto |
| `hc-progress` | Barra de progreso scroll |

---

## 19. Internacionalización

```jsx
import { useTranslation } from 'react-i18next'

function MiComponente() {
  const { t } = useTranslation()
  return <h1>{t('home.hero1')}</h1>
}
```

Traducciones en:
- `src/i18n/locales/es.json` (español — default)
- `src/i18n/locales/en.json` (inglés)
- `src/i18n/locales/pt.json` (portugués)

El idioma persiste en `uiStore` → localStorage.

---

## 20. Variables de Entorno Frontend

No hay `.env` separado para el frontend. El único ajuste en producción es el proxy:

- **Desarrollo**: `vite.config.js` proxy `/api` → `http://localhost:8080`
- **Producción**: el frontend compilado se sirve desde Spring Boot, que maneja `/api` directamente

Para cambiar la URL base de la API en producción modificar `src/services/api.js`:

```js
const api = axios.create({ baseURL: '/api', timeout: 15000 })
```
