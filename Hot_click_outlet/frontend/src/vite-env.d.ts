/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_PROXY?: string
  readonly VITE_API_PROXY_INSECURE?: string
  readonly VITE_POSTHOG_HOST?: string
  readonly VITE_POSTHOG_PROJECT_TOKEN?: string
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
