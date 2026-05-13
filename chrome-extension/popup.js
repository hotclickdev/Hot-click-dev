// Lógica del popup de la extensión HOTCLICK

const $ = (id) => document.getElementById(id)

let config = { apiUrl: '', jwtToken: '' }
let publicaciones = []

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  config = await loadConfig()

  $('gearBtn').addEventListener('click', toggleSettings)
  $('saveBtn').addEventListener('click', saveConfig)
  $('refreshBtn').addEventListener('click', () => loadPublicaciones())

  if (!config.apiUrl || !config.jwtToken) {
    openSettings()
    showStatus('Configura la URL de la API y el token JWT para continuar.', false)
  } else {
    await loadPublicaciones()
  }
})

// ─── Settings ────────────────────────────────────────────────────────────────
function toggleSettings() {
  const panel = $('settingsPanel')
  const isOpen = panel.classList.contains('open')
  if (isOpen) {
    panel.classList.remove('open')
  } else {
    openSettings()
  }
}

function openSettings() {
  const panel = $('settingsPanel')
  panel.classList.add('open')
  $('apiUrl').value = config.apiUrl
  $('jwtToken').value = config.jwtToken
}

async function saveConfig() {
  config.apiUrl = $('apiUrl').value.trim().replace(/\/$/, '')
  config.jwtToken = $('jwtToken').value.trim()
  await chrome.storage.local.set({ hcConfig: config })
  $('settingsPanel').classList.remove('open')
  showToast('Configuración guardada')
  await loadPublicaciones()
}

async function loadConfig() {
  const data = await chrome.storage.local.get('hcConfig')
  return data.hcConfig ?? { apiUrl: '', jwtToken: '' }
}

// ─── Cargar publicaciones ────────────────────────────────────────────────────
async function loadPublicaciones() {
  if (!config.apiUrl || !config.jwtToken) return

  showStatus('<div class="spinner"></div>Cargando...', true)

  const res = await chrome.runtime.sendMessage({
    type: 'API_FETCH',
    url: `${config.apiUrl}/api/publicaciones-fb`,
    token: config.jwtToken,
  })

  if (!res.ok) {
    showStatus(`Error ${res.status || ''}: ${res.error || 'No se pudo conectar a la API'}`, false)
    return
  }

  publicaciones = Array.isArray(res.data) ? res.data : []
  renderLista()
}

// ─── Renderizar lista ────────────────────────────────────────────────────────
function renderLista() {
  const content = $('content')
  const count = $('countLabel')

  if (publicaciones.length === 0) {
    content.innerHTML = `
      <div class="status">
        No hay publicaciones en la cola.<br>
        <span style="font-size:11px">Analiza una foto en el panel admin para generar texto.</span>
      </div>`
    count.textContent = ''
    return
  }

  const pendientes = publicaciones.filter((p) => p.estadoPublicacion !== 'PUBLICADO')
  count.textContent = `${pendientes.length} pendiente${pendientes.length !== 1 ? 's' : ''}`

  const items = publicaciones.map((pub) => {
    const titulo = pub.tituloFb || pub.producto?.nombreProducto || `#${pub.id}`
    const precio = pub.precioPublicar
      ? `₡${new Intl.NumberFormat('es-CR').format(pub.precioPublicar)}`
      : ''
    const badgeClass = {
      LISTO: 'badge-listo',
      PENDIENTE: 'badge-pendiente',
      PUBLICADO: 'badge-publicado',
      ERROR: 'badge-error',
    }[pub.estadoPublicacion] ?? 'badge-pendiente'

    const canFill = pub.estadoPublicacion !== 'PUBLICADO'

    return `
      <div class="pub-item" data-id="${pub.id}">
        <div class="pub-title" title="${htmlEsc(titulo)}">${htmlEsc(titulo)}</div>
        <div class="pub-meta">
          <span class="badge ${badgeClass}">${pub.estadoPublicacion}</span>
          ${precio ? `<span>${precio}</span>` : ''}
          ${pub.condicionFb ? `<span>· ${htmlEsc(pub.condicionFb)}</span>` : ''}
        </div>
        ${canFill ? `
          <div class="pub-actions">
            <button class="btn-fill" data-id="${pub.id}">Llenar en Marketplace</button>
            <button class="btn-copy" data-id="${pub.id}" title="Copiar texto">Copiar</button>
          </div>
        ` : `
          <div style="margin-top:6px;font-size:11px;color:#22c55e">✓ Publicado en Facebook</div>
        `}
      </div>
    `
  }).join('')

  content.innerHTML = `<div class="list">${items}</div>`

  // Botones "Llenar en Marketplace"
  content.querySelectorAll('.btn-fill').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pub = publicaciones.find((p) => p.id === Number(btn.dataset.id))
      if (!pub) return
      btn.textContent = 'Abriendo...'
      btn.disabled = true
      await chrome.runtime.sendMessage({ type: 'OPEN_FB_AND_FILL', pub })
      btn.textContent = 'Enviado a la pestaña FB'
      setTimeout(() => { btn.textContent = 'Llenar en Marketplace'; btn.disabled = false }, 3000)
    })
  })

  // Botones "Copiar"
  content.querySelectorAll('.btn-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pub = publicaciones.find((p) => p.id === Number(btn.dataset.id))
      if (!pub?.textoFb) return
      navigator.clipboard.writeText(pub.textoFb)
      btn.textContent = '✓'
      setTimeout(() => { btn.textContent = 'Copiar' }, 2000)
    })
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function showStatus(html, raw = true) {
  $('content').innerHTML = raw
    ? `<div class="status">${html}</div>`
    : `<div class="status"><p>${htmlEsc(html)}</p></div>`
}

function showToast(msg, type = 'success') {
  const old = document.querySelector('.toast')
  if (old) old.remove()
  const t = document.createElement('div')
  t.className = `toast${type === 'error' ? ' error' : ''}`
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 2500)
}

function htmlEsc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
