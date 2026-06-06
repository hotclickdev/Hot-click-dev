# FORMULARIO DE CONSENTIMIENTO INFORMADO

## Plataforma HotClick

**Uso:** Este texto debe integrarse junto a una casilla de verificación (checkbox) desmarcada por defecto en los formularios de registro y pasarela de pago.

**Archivo de implementación:** `RegisterPage.jsx` (paso 1) y `CheckoutPage.jsx`

---

## TEXTO DEL CONSENTIMIENTO

Al marcar esta casilla, manifiesto de forma libre, expresa, voluntaria e inequívoca que he sido instruido acerca de los términos de la Política de Privacidad de HotClick. Autorizo expresamente a HotClick para que recopile, almacene y trate mis datos personales en su base de datos para la gestión interna de mis compras. Asimismo, otorgo mi consentimiento expreso para que mis datos de contacto (nombre, teléfono y dirección) sean transferidos al comercio vendedor correspondiente con el único fin de coordinar y ejecutar la entrega del producto adquirido. Se me ha informado que puedo ejercer mis derechos ARCO dirigiendo una comunicación escrita al correo electrónico: hotclick.cr@gmail.com.

---

## REQUISITOS TÉCNICOS DE IMPLEMENTACIÓN

1. La casilla debe estar **desmarcada por defecto** (unchecked).
2. El botón de envío del formulario debe quedar **deshabilitado** mientras la casilla no esté marcada.
3. El texto debe incluir hipervínculos a `/privacidad` y `/terminos`.
4. El estado del consentimiento debe registrarse como parte de la creación del usuario.
5. La fecha y hora del consentimiento otorgado debe almacenarse en la base de datos.

---

## BASE LEGAL

El mecanismo de consentimiento implementado cumple con:

- **Ley N.° 8968**, artículo 5, inciso e): definición de consentimiento como manifestación libre, específica, informada e inequívoca.
- **Reglamento Decreto N.° 37554-JP**, artículo 9: requisitos formales del consentimiento informado.
- **Principio de transparencia** reconocido por la PRODHAB.
