# Checklist de buscadores (operación, fuera del código)

Hacerlo una vez en las cuentas de HotClick, después de desplegar este posicionamiento.

1. **Google Search Console** (https://search.google.com/search-console): propiedad `https://hotclick.lat`. Enviar `https://hotclick.lat/sitemap.xml`. Revisar cobertura de `/tienda/`, `/comprar/`, `/tiendas/` y `/servicios/`.
2. **Bing Webmaster** (https://www.bing.com/webmasters): el enlace ya está en el admin, pestaña Sistema. Importar el sitio desde Search Console o pegar el mismo sitemap.
3. **Google Merchant Center** (https://merchants.google.com): feed `https://hotclick.lat/api/public/feed/shopping.xml`. La descripción del canal ya no dice solo ropa y zapatos.
4. **IndexNow**: ya está cableado y apagado por defecto. Para activarlo, generá una clave (8 a 128 caracteres, letras, números o guion) y ponela en `.env` del servidor como `INDEXNOW_KEY` (o `INDEXNOW_KEY_FILE` con la ruta a un archivo fuera de git), y reiniciá la app. La app sirve sola `https://hotclick.lat/{clave}.txt`. Nunca va en el repo. Detalle en `resumen-seo-geo-ssr.md`.
5. Pedir indexación de la home, `/servicios/buscar-producto` y `/servicios/digitalizar-inventario` después del deploy. El resto entra por el sitemap.
