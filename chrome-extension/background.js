// Service worker — maneja llamadas a la API de HOTCLICK

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'API_FETCH') {
    handleFetch(msg).then(sendResponse).catch((err) =>
      sendResponse({ ok: false, error: err.message })
    )
    return true // mantiene el canal abierto para la respuesta async
  }

  if (msg.type === 'OPEN_FB_AND_FILL') {
    openFbAndFill(msg.pub)
    sendResponse({ ok: true })
    return false
  }
})

async function handleFetch({ url, method = 'GET', body, token }) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

async function openFbAndFill(pub) {
  const FB_URL = 'https://www.facebook.com/marketplace/create/item'

  // Busca si ya hay una tab de FB Marketplace abierta
  const tabs = await chrome.tabs.query({ url: 'https://www.facebook.com/marketplace/create/*' })

  let tab
  if (tabs.length > 0) {
    tab = tabs[0]
    await chrome.tabs.update(tab.id, { active: true })
  } else {
    tab = await chrome.tabs.create({ url: FB_URL })
    // Espera que la página cargue antes de enviar el mensaje
    await waitForTabLoad(tab.id)
  }

  // Envía los datos al content.js
  await chrome.tabs.sendMessage(tab.id, { type: 'FILL_FORM', pub })
}

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    function listener(id, changeInfo) {
      if (id === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener)
        // Pequeño delay para que React renderice el formulario
        setTimeout(resolve, 1500)
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
  })
}
