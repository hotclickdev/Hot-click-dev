/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_PROXY?: string
  readonly VITE_API_PROXY_INSECURE?: string
  readonly VITE_POSTHOG_HOST?: string
  readonly VITE_POSTHOG_PROJECT_TOKEN?: string
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
  readonly VITE_GA4_ID?: string
  readonly VITE_CLARITY_ID?: string
  readonly VITE_GOOGLE_SITE_VERIFICATION?: string
  readonly VITE_BING_SITE_VERIFICATION?: string
}

interface Window {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
