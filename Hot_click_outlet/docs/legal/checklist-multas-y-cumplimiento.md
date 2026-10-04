# Lista para evitar multas — Costa Rica y fuera

Orientación para Andres. **No es un dictamen de abogado** y no sustituye a la PRODHAB, el MEIC ni un profesional. Fecha de esta lista: 4 de octubre de 2026. Trabajo en la rama `legal/cumplimiento-cr`.

Los montos en colones son **aproximados**, con el salario base judicial 2026 de ₡462.200 (circular del Poder Judicial). La Ley 8968 cita el cargo de auxiliar judicial I; el MEIC usa el menor salario mínimo mensual, que es otra cifra. Un abogado confirma el monto exacto si llega un procedimiento.

---

## 1. Lo que ya cubre el sitio (hoy)

| Tema | Qué hace HotClick |
|---|---|
| Cookies | Aviso al entrar, sin esperar 12 segundos. Tres opciones: rechazar opcionales, configurar, aceptar todas. Análisis y publicidad van por separado. El pie tiene «Configurar cookies». |
| Analítica y Meta | No arrancan sin el consentimiento de esa categoría. |
| Privacidad y términos | Publicados, con identidad, ARCO, encargados, retención de 5 años por Hacienda. |
| Menores | La cuenta pide declarar 18 años. No se pide fecha de nacimiento (eso evitaría “saber” que hay un niño de 13). Políticas: no se registran menores; si aparece uno, se cierra la cuenta. |
| IA | El chat dice que es un asistente de inteligencia artificial, no una persona. Privacidad nombra a Anthropic. |
| Consumidor | Retracto de 8 días hábiles, precios en colones, canal de reclamo. |
| Consentimiento | Checkbox en registro y checkout; queda en `hot_click_consentimiento_log_tb`. |

---

## 2. Costa Rica — multas que sí pueden llegar

### Protección de datos (Ley N.° 8968 + PRODHAB)

| Falta | Qué la dispara en HotClick | Sanción (art. 28) | Orden de magnitud 2026 |
|---|---|---|---|
| Leve | Banner o política que no informan bastante (art. 29) | Hasta 5 salarios base | hasta ~₡2,3 millones |
| Grave | Analítica o Meta sin consentimiento; usar datos para otra cosa; no atender ARCO (art. 30) | 5 a 20 salarios base | ~₡2,3 a ~₡9,2 millones |
| Gravísima | Base de clientes **sin inscribir** en la PRODHAB; tratar datos sensibles; transferir al exterior sin base (art. 31) | 15 a 30 salarios base **y** suspensión del fichero 1 a 6 meses | ~₡6,9 a ~₡13,9 millones |

La PRODHAB lo dice claro: operar una base que debe estar inscrita y no estarlo es **falta gravísima**. Canon anual de regulación: **USD 200**. HotClick declara que no vende datos: el canon extra por comercializar ficheros no aplica mientras eso sea cierto.

**Datos sensibles** (art. 3): origen racial, opiniones políticas, fe, vida sexual, salud, biometría. El chat no debe pedirlos. Si un usuario los escribe, no se reutilizan.

**Menores en CR:** la mayoría de edad es 18 (Código Civil, art. 37). La Ley 8968 no fija “13 años”; el consentimiento de un menor lo da quien tiene la patria potestad (Sala Constitucional). Por eso el producto bloquea a menores de 18, no solo a menores de 13.

### Consumidor (Ley N.° 7472 + MEIC)

Multas de **1 a 40 veces el menor salario mínimo mensual** (art. 57), según el inciso. El reglamento de comercio electrónico (arts. 245 y ss.) trata el incumplimiento de información del comerciante como infracción al art. 34.

Riesgos típicos de una tienda en línea:

- No mostrar razón social, cédula y domicilio (art. 247 del reglamento). **Sigue pendiente** hasta que Andres confirme esos datos.
- Precio que no es el final (IVA, envío) antes de pagar.
- Retracto más corto que 8 días hábiles, o “no se aceptan devoluciones” a secas.
- Publicidad engañosa.

### Otros trámites (no son “multa de cookies”, pero sí cierran el negocio)

1. Inscripción en Hacienda (TRIBU-CR). Vender en línea no exime.
2. Patente municipal del cantón del domicilio, también si es virtual.
3. CCSS e INS si hay patrono o la municipalidad lo pide.
4. Inscripción presencial de la base en la PRODHAB (ver `expediente-gobierno-cr.md`).

---

## 3. Fuera de Costa Rica — si el sitio llega a otros países

`hotclick.lat` se ve en todo el mundo. Si **no se busca** vender a Europa ni a Estados Unidos (solo CRC, envíos en CR, copy en español de CR), el riesgo es menor, pero no es cero: analítica y publicidad miden a quien entra, viva donde viva.

| Norma | Cuándo pega | Qué multa citan | Qué hacer en HotClick |
|---|---|---|---|
| **COPPA (EE. UU.), menores de 13** | Sitio dirigido a niños **o** conocimiento real de que se recogen datos de un menor de 13. La regla reformada rige; el plazo general de cumplimiento fue el **22 de abril de 2026**. | Hasta **USD 53.088 por infracción** (ajuste FTC 2025; se cobra por caso, no “una vez por sitio”). | No registrar menores. No pedir fecha de nacimiento. Cerrar cuentas de menores. No hacer el sitio “para niños”. |
| **RGPD (UE/EEE)** | Ofrecer bienes a personas en la UE **o** monitorear su comportamiento (cookies de analítica/anuncios). | Hasta **€20 millones o 4 %** de la facturación mundial. | No anunciar envíos a Europa. Consentimiento previo (ya). Si un día se vende a la UE: DPO/representante, bases legales, DPIA. |
| **ePrivacy / cookies UE** | Mismo alcance que el RGPD si hay usuarios UE. | Va con el RGPD y normas nacionales. | Tres botones + panel por categoría (ya, estilo KPMG/bancos). |
| **EU AI Act, art. 50** | Chat que habla con personas. Obligación de transparencia **desde el 2 de agosto de 2026**. El Omnibus no la aplazó. | Hasta **€15 millones o 3 %** (en pyme, el menor de los dos). | El chat ya dice que es IA, no una persona. No fingir que hay un humano. |
| **Prohibiciones del AI Act** | Scoring social, manipulación, etc. Un chat de tienda **no** es de alto riesgo. | Hasta €35 millones / 7 %. | No usar el chat para perfilar crédito ni para menores. |

Costa Rica **no tiene ley de IA aprobada** a octubre de 2026 (expedientes 23.771, 23.919, 24.484 en trámite; la ENIA 2024-2027 es política, no ley). El chat se rige hoy por la 8968: los mensajes son datos personales.

Los proyectos 22.388 y 23.097 quieren acercar la 8968 al RGPD. No están vigentes. Cuando salgan, habrá que rehacer políticas y, casi seguro, las multas suben.

---

## 4. Cómo evitar la multa de IA (lista corta)

1. Decir siempre que el chat es IA (ya en el encabezado).
2. No vender ni entrenar modelos propios con los chats de clientes.
3. No meter en el prompt cédulas, tarjetas ni datos de salud.
4. Conservar chats solo el tiempo de soporte; atender ARCO sobre esos hilos.
5. Anthropic queda como encargado en la política (ya).
6. Si un día hay usuarios en la UE, revisar de nuevo el art. 50 y el contrato con Anthropic.

---

## 5. Cómo evitar la multa del sitio (lista corta)

1. **Inscribir la base en la PRODHAB.** Es el hueco más caro en Costa Rica. El código no lo hace: es ventanilla.
2. Completar razón social, cédula y domicilio en `identidadComerciante.ts` cuando existan.
3. No encender GA4, PostHog, Clarity ni Meta sin el banner (ya).
4. No registrar menores de 18. Si un padre escribe, borrar.
5. Responder ARCO en **10 días hábiles**.
6. Precio final en colones y retracto de 8 días **antes** de pagar.
7. No decir “aceptar al navegar” ni esconder el rechazo. El aviso nuevo pone las tres opciones al mismo nivel.
8. Hacienda, patente y (si aplica) CCSS/INS al día.

---

## 6. Lo que Andres hace fuera del código (hoy / esta semana)

1. Confirmar persona física o jurídica, cédula, domicilio y cantón.
2. Hacienda (TRIBU-CR) y patente del cantón.
3. Cita presencial en la PRODHAB con el paquete de `expediente-gobierno-cr.md`.
4. Cuando existan cédula y domicilio, avisar para publicarlos en el sitio.
5. Si quiere vender a Europa o a EE. UU., parar y pedir revisión de RGPD/COPPA antes de abrir envíos.

Un abogado costarricense revisa las políticas antes de la inscripción en la PRODHAB. Esta lista no reemplaza esa revisión.
