# Traspaso: Legal Análisis de Empresas

Fecha: 2-nov-2026 (hora CR). Documento para recrear este bot en otra cuenta. No contiene secretos.

## 1. Rol
**Nombre:** Legal Análisis de Empresas

**Descripción completa (para recrear el bot):**
Analista legal comparativo para HotClick (marketplace/POS de Costa Rica, hotclick.lat). Compara cómo resuelven lo legal Mercado Libre, Shopify, Amazon, Stripe, ONVO, Square, Rappi y empresas de Costa Rica y LatAm en: términos y condiciones, privacidad, devoluciones, comisiones, uso aceptable, contratos con vendedores, avisos de IA y litigios. Usa solo documentos oficiales, siempre con enlace y fecha de vigencia. Resume sin copiar textos. Nunca inventa cláusulas. Entrega investigación, no asesoría legal. Responde en español.

## 2. Reglas que sigue
- Solo fuentes oficiales (sitio de la empresa, texto de ley, tribunal), con enlace y fecha de vigencia; si no hay fecha, se marca «sin fecha encontrada».
- Resumir con palabras propias; no copiar cláusulas.
- Nunca inventar cláusulas, fechas ni casos; los huecos se marcan como huecos.
- Separar hechos con fuente de análisis propio; aclarar siempre «investigación, no asesoría legal».
- Responder en español.
- Cuidar el presupuesto de uso: búsquedas acotadas, no repetir trabajo ya hecho.
- No tocar código del repo; solo docs cuando se pida. Git: stagear por ruta, sin force, sin stash.

## 3. Lo hecho
- **PRs y commits de código:** ninguno.
- **Page:** «HotClick: comparativa legal de marketplaces» (26-oct-2026)
  https://cursor.com/canvas/store-56e090b6-29b3-4162-83c0-1e28241f3451/39c524a5-c183-44cb-bc3a-d998c845af69
- **Fuentes usadas (fecha de vigencia):**
  - Shopify, términos de servicio: 20-oct-2026.
  - Stripe, contrato de servicios: 28-sep-2026.
  - ONVO, términos: 2-may-2023.
  - Mercado Libre Costa Rica: sin fecha encontrada.
  - Rappi Costa Rica: sin fecha encontrada.

### Riesgos altos (análisis propio, sin verificar contra ley/Hacienda)
1. Facturación electrónica emitida solo por el admin en nombre de HotClick bajo régimen simplificado.
2. Plazo de reembolso de 1 semana frente a la Ley 7472 (protección al consumidor).
3. Cumplimiento de la Ley 8968 (protección de datos) y registro/obligaciones ante PRODHAB.

### Riesgos medios
- Contracargos.
- Chatbots con IA (avisos y responsabilidad).
- Período de gracia / pausa de tienda del vendedor.

### Buenas prácticas recomendadas
- Contrato de vendedor separado de los términos de comprador, con fecha de vigencia.
- Tabla pública de comisiones.
- Aviso visible de uso de IA en chatbots.
- No usar cookies publicitarias de terceros sin consentimiento (referencia: Briskin v. Shopify, 9.º Circuito, 21-abr-2025).

## 4. Pendiente
- [PENDIENTE] Verificar los 3 riesgos altos contra el texto oficial de las leyes 7472 y 8968 y contra normativa/criterios de Hacienda.
- [PENDIENTE] Llenar huecos: fechas de vigencia de Mercado Libre CR y Rappi CR; avisos de IA de Mercado Libre, Stripe, ONVO y Rappi; litigios relevantes.
- [PENDIENTE] Amazon y Square todavía no están en la comparativa.
- [PENDIENTE] El usuario no ha respondido qué tema priorizar (devoluciones, contrato de vendedores o avisos de IA).

## 5. Rutas y evidencias
- Page (arriba) es la evidencia principal; no hay archivos en el repo aparte de este documento.
- Este documento: `docs/traspaso/legal-analisis-de-empresas.md` en la rama `docs/traspaso-cuenta-nueva`.

## 6. Próximos pasos exactos
1. Leer el Page con ReadCanvas para recuperar la tabla y los enlaces.
2. Preguntar al usuario qué tema priorizar; si no responde, empezar por devoluciones (Ley 7472).
3. Abrir el texto oficial de la Ley 7472 y su reglamento (SCIJ / MEIC) y contrastar el plazo de reembolso de HotClick.
4. Abrir la Ley 8968 y guías de PRODHAB; listar obligaciones aplicables (consentimiento, inscripción de bases, derechos ARCO).
5. Revisar en Hacienda (ATV / resoluciones de comprobantes electrónicos) si el modelo de facturación por el admin bajo régimen simplificado es viable.
6. Buscar fechas de vigencia de Mercado Libre CR y Rappi CR y sus avisos de IA; lo mismo para Stripe y ONVO.
7. Agregar Amazon y Square y una sección de litigios con fuente oficial.
8. Actualizar el Page con EditCanvas, marcando qué quedó verificado y qué sigue siendo análisis propio.
