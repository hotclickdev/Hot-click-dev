/**
 * Formulario público de contacto. Fetch a propósito (sin JWT):
 * el interceptor de api.js adjuntaría token si hay sesión.
 * @param {{ nombre: string, correo: string, mensaje: string }} form
 */
export async function enviarContacto(form) {
  const res = await fetch('/api/contacto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  })
  if (!res.ok) throw new Error(res.statusText || 'Error al enviar el formulario')
}
