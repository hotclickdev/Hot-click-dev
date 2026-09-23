# Anexo 5 — Estados de interfaz y formularios

**Padre:** [../visual-ux-audit.md](../visual-ux-audit.md)

Leyenda matriz: OK = contemplado · DÉBIL = parcial/toast-only · NO = ausente · N/A

---

## 1. Matriz de estados — comprador

| Pantalla | Loading | Empty | Error | Disabled | Sin permisos |
|----------|---------|-------|-------|----------|--------------|
| Home | DÉBIL | OK (hide) | DÉBIL toast | N/A | N/A |
| Catálogo | OK | OK | DÉBIL (parece empty) | N/A | N/A |
| Detalle producto | OK | OK not-found | DÉBIL→not-found | OK stock | N/A |
| Carrito | N/A local | OK | DÉBIL cross-sell | N/A | N/A |
| Checkout form | OK sub-estados | OK empty cart | OK CheckoutPayError | OK pay btn | N/A guest OK |
| Post-pago | OK poll | N/A | OK | N/A | Mis pedidos guest DÉBIL |
| Wishlist | N/A | OK | N/A | OK OOS | N/A |
| Mis pedidos | OK | OK | DÉBIL toast | N/A | Redirect login |
| Profile | DÉBIL | parcial | DÉBIL | N/A | Protected |
| Descubrí | OK | mazo vacío→resultados | OK retry | N/A | N/A |
| Tienda slug | OK skeleton | OK 404 | OK retry | N/A | noDisponible |
| Visitante shop | OK | OK | DÉBIL | N/A | N/A |
| Visitante dir/pago | N/A | OK stub | N/A | N/A | N/A |

---

## 2. Matriz — vendedor Figma

| Pantalla | Loading | Empty | Error | Notas |
|----------|---------|-------|-------|-------|
| Productos/Pedidos/Bodegas | OK ListadoFeedback | OK conversacional | OK alert | Contrato F5 |
| Reportes | DÉBIL texto | DÉBIL | DÉBIL | Sin ListadoFeedback |
| Tienda Emp | DÉBIL | OK | DÉBIL | |
| Tienda PYME/Plus | NO (mock) | filtro | NO | Falso preview |
| Encargos | OK Spinner | OK filtro | toast only | |
| Cobro | DÉBIL | OK | toast | |
| Wizards producto/plan/equipo | enviando | N/A | inline/toast | Anti-doble-submit OK |
| Sucursales modal | — | OK | toast | a11y modal incompleto |

---

## 3. Matriz — admin / POS (agregado)

| Patrón | Loading | Empty | Error | Sin permisos |
|--------|---------|-------|-------|--------------|
| Tablas admin | mixto Spinner/texto | mixto | toast frecuente | Guard → redirect `/admin` (sin mensaje “no tenés permiso”) |
| POS venta | OK | carrito vacío **silencioso** | toast + reporte | N/A |
| POS caja | OK | sin turno OK | — | N/A |
| Config secciones | mixto | — | toast | fork ADMIN |
| Aprobaciones | — | — | — | IT only |

**Hueco transversal:** Redirect por falta de permiso **sin explicación** — el usuario solo “vuelve al inicio admin”.

---

## 4. Feedback post-acción

| Acción | Feedback típico | ¿Sabe qué pasó? | ¿Qué sigue? |
|--------|-----------------|-----------------|-------------|
| Add to cart marketplace | Toast | Sí | Sticky / mini cart variable |
| Checkout pagar OK | Pantalla éxito / SINPE pending | Sí | Links claros |
| Checkout fail | CheckoutPayError + retry ≤3 | Sí | Retry / cambiar método |
| Crear producto seller | PantallaExitoWizard | Sí | CTA listado |
| Eliminar producto | Navigate / toast | Variable Emp vs shared | Volver listado |
| Guardar perfil/negocio | Toast | Sí | Queda en página |
| Invitar equipo | PantallaExito | Sí | |
| Quitar miembro | Toast | Sí | |
| POS cobro | Toast + recibo | Sí | Nueva venta |
| POS cobro carrito vacío | **Nada** | No | Confusión |
| Admin CRUD tablas | Toast ad hoc | Variable | |
| 401 API | Refresh o logout→login | Parcial | Interrupción brusca |

**Contrato recomendado (conceptual):**  
- Mutaciones destructivas → ConfirmModal + toast éxito/error.  
- Mutaciones simples → toast.  
- Flujos multi-paso → PantallaExito o resumen.  
- Loading de lista → skeleton, nunca lista vacía fingida.  
- Error de red → mensaje + reintentar, no empty state.

---

## 5. Auditoría de formularios (principales)

### Checkout marketplace

| Campo | ¿Necesario? | ¿Repetido? | ¿Default? | Nota |
|-------|-------------|------------|-----------|------|
| Envío | Sí | No | Sí default | OK |
| Teléfono | Sí si address | Logueado lo reescribe | Vacío | Prefill faltante |
| Dirección | Sí | Idem | Vacío | Prefill / address book faltante |
| Guest email | Sí guest | vs sinpeEmail | Vacío | Unificar |
| Guest phone | Sí | vs sinpeTel | Vacío | Unificar |
| Pago | Sí | No | TILOPAY | OK |
| SINPE nombre/cédula | Sí método | Podría venir de perfil | Vacío | |
| Consentimiento | Legal sí | No | Unchecked | OK |
| Cupón / gift / notas | Opcional | — | — | OK |
| SmartField estilos | — | — | — | Look distinto al Input global |

### Registro comprador

Campos densos (nombre + 2 apellidos + id + tel + pass). Password rules inconsistentes (UI 8 vs check 6).

**Posible:** un apellido; teléfono opcional post-verify; una sola regla password documentada.

### Registro empresa

Paso 0 ATV bloqueante; copy técnica.  
**Posible:** checkbox “estoy inscrito” dentro de paso empresa; No → continuar con aviso, no callejón WA.

### Producto seller (4–5)

Campos alineados a negocio. Foto opcional OK. Edit: estado como paso extra → fusionable.

### Producto admin (7–8)

Muchos opcionales como pasos. **Agrupar.**

### POS cobro

Pocos campos. Jerga ONVO. Monto recibido + vuelto OK para efectivo.

### Tienda checkout

Form corto OK. Labels claros. Pagos sin tarjeta — coherente con micro-negocios offline.

### Config / Sistema forms

Inline styles, cfg-input, validación ad hoc — **Reemplazar** por Input + validación compartida.

---

## 6. Placeholders vs labels

- Wizards seller: `CampoAnimado` floating label — OK.
- Checkout SmartField: mezcla placeholder/label — revisar contraste.
- Tablas admin filtros: placeholders sin label visible — a11y débil.

**Regla:** Placeholder no sustituye `<label>`; error asociado con `aria-describedby`.

---

## 7. Offline / partial data

| Área | Offline |
|------|---------|
| Captura inventario PWA | Cola IndexedDB + sync — módulo dedicado (fuera profundidad UX visual) |
| AdminOfflineCola | UI existe |
| Marketplace | SW NetworkFirst productos — riesgo stale (P2 técnico) |
| Seller listas | Dependen de red; sin empty “estás offline” genérico |

---

## 8. Resumen de gaps de estados

1. Errores de catálogo/home que parecen empty.  
2. Redirect sin permiso sin mensaje.  
3. POS empty cart silencioso.  
4. Guest → Mis pedidos desde PagoPendiente.  
5. Tienda mock sin estados de red.  
6. AuthPromptModal nunca disparado (estado “prompt” muerto).  
7. Skeletons ausentes en varias listas admin y reportes seller.
