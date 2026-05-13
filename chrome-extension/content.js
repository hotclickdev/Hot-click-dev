// Corre en https://www.facebook.com/marketplace/create/*
// Recibe datos del background/popup y rellena el formulario de Marketplace

let pendingData = null

// ─── Escucha mensajes del popup / background ────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'FILL_FORM') {
    pendingData = msg.pub
    startFill(msg.pub)
    sendResponse({ ok: true })
  }
  if (msg.type === 'PING') {
    sendResponse({ ok: true })
  }
})

// ─── Botón flotante HOTCLICK ─────────────────────────────────────────────────
function injectButton() {
  if (document.getElementById('hc-btn')) return

  const btn = document.createElement('div')
  btn.id = 'hc-btn'
  btn.innerHTML = `
    <div style="
      position:fixed; bottom:24px; right:24px; z-index:99999;
      background:#4f7cff; color:#fff; font-family:system-ui,sans-serif;
      font-size:13px; font-weight:700; padding:10px 16px; border-radius:12px;
      box-shadow:0 4px 20px rgba(79,124,255,0.5); cursor:pointer;
      display:flex; align-items:center; gap:8px; user-select:none;
      transition:transform 0.15s,box-shadow 0.15s;
    " onmouseover="this.style.transform='scale(1.04)'"
       onmouseout="this.style.transform='scale(1)'"
    >
      <span style="font-size:11px;font-weight:900;background:#fff;color:#4f7cff;padding:2px 5px;border-radius:5px;">HC</span>
      Llenar formulario
    </div>
  `
  btn.addEventListener('click', () => {
    if (pendingData) {
      startFill(pendingData)
    } else {
      showToast('Abre el popup de HOTCLICK y selecciona un producto primero.', 'warn')
    }
  })
  document.body.appendChild(btn)
}

// ─── Truco React: setea valor nativo y dispara eventos ──────────────────────
function setReactValue(el, value) {
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(el, value)
  el.dispatchEvent(new Event('input',  { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

// ─── Selectores de campos del formulario ────────────────────────────────────
function findField(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el) return el
  }
  return null
}

function findInputByLabel(labelText) {
  const labels = document.querySelectorAll('label, [aria-label]')
  for (const el of labels) {
    const text = el.getAttribute('aria-label') || el.textContent
    if (text?.toLowerCase().includes(labelText.toLowerCase())) {
      // Si el propio elemento es un input
      if (['INPUT','TEXTAREA'].includes(el.tagName)) return el
      // Busca el input dentro o el siguiente input
      const inner = el.querySelector('input, textarea')
      if (inner) return inner
    }
  }
  return null
}

// ─── Llenar el formulario paso a paso ───────────────────────────────────────
async function startFill(pub) {
  showToast('Rellenando formulario...', 'info')

  // Espera que el formulario esté listo (máx 5 intentos)
  let ready = false
  for (let i = 0; i < 5; i++) {
    const f = findField(['input[type="text"]', 'textarea', '[role="combobox"]'])
    if (f) { ready = true; break }
    await delay(800)
  }
  if (!ready) {
    showToast('No se encontró el formulario de Marketplace. ¿Estás en la página correcta?', 'error')
    return
  }

  // ── Título ──
  await delay(300)
  const titleInput = findField([
    'input[placeholder*="itle"]',
    'input[aria-label*="itle"]',
    'input[name="title"]',
  ]) || findInputByLabel('title') || findInputByLabel('título')

  if (titleInput) {
    titleInput.focus()
    setReactValue(titleInput, pub.tituloFb || pub.producto?.nombreProducto || '')
    await delay(400)
  }

  // ── Precio ──
  const priceInput = findField([
    'input[aria-label*="rice"]',
    'input[placeholder*="rice"]',
    'input[aria-label*="recio"]',
    'input[placeholder*="recio"]',
    'input[type="number"]',
  ]) || findInputByLabel('price') || findInputByLabel('precio')

  if (priceInput) {
    priceInput.focus()
    setReactValue(priceInput, String(pub.precioPublicar || ''))
    await delay(400)
  }

  // ── Descripción ──
  const descInput = findField([
    'textarea[aria-label*="escription"]',
    'textarea[aria-label*="escripción"]',
    'textarea[placeholder*="escription"]',
    'textarea[placeholder*="escripción"]',
    'textarea',
  ]) || findInputByLabel('description') || findInputByLabel('descripción')

  if (descInput) {
    descInput.focus()
    setReactValue(descInput, pub.textoFb || '')
    await delay(400)
  }

  // ── Condición — busca botones/radios con el texto ──
  if (pub.condicionFb) {
    const condMap = {
      'Nuevo': ['New', 'Nuevo', 'New with tags', 'Brand new'],
      'Usado': ['Used', 'Usado', 'Used - Good', 'Good'],
      'Reacondicionado': ['Refurbished', 'Reacondicionado', 'Seller refurbished'],
    }
    const condText = condMap[pub.condicionFb] ?? [pub.condicionFb]
    for (const text of condText) {
      const btn = findButtonByText(text)
      if (btn) { btn.click(); await delay(300); break }
    }
  }

  showToast('Formulario rellenado. Revisa los campos y haz clic en Publicar.', 'success')
}

function findButtonByText(text) {
  const lc = text.toLowerCase()
  const candidates = document.querySelectorAll(
    'button, [role="radio"], [role="option"], [role="menuitemradio"], label'
  )
  for (const el of candidates) {
    if (el.textContent?.trim().toLowerCase() === lc) return el
  }
  return null
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ─── Toast visual ────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const old = document.getElementById('hc-toast')
  if (old) old.remove()

  const colors = { info: '#4f7cff', success: '#22c55e', error: '#ef4444', warn: '#f59e0b' }
  const toast = document.createElement('div')
  toast.id = 'hc-toast'
  toast.textContent = msg
  toast.style.cssText = `
    position:fixed; top:20px; right:20px; z-index:99999;
    background:${colors[type]}; color:#fff;
    padding:10px 16px; border-radius:10px; font-size:13px; font-family:system-ui,sans-serif;
    box-shadow:0 4px 16px rgba(0,0,0,0.3); max-width:320px; line-height:1.4;
    animation: hcFadeIn 0.2s ease;
  `
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}

// ─── Init ────────────────────────────────────────────────────────────────────
injectButton()
