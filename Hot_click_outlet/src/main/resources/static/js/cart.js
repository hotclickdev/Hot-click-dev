/**
 * HOTCLICK - Carrito de Compras
 * Gestión del carrito con localStorage
 * @version 1.0
 */

// ====================================================
// VARIABLES GLOBALES
// ====================================================

let carrito = [];

// ====================================================
// INICIALIZACIÓN
// ====================================================

function inicializarCarrito() {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
        try {
            carrito = JSON.parse(carritoGuardado);
        } catch(e) {
            carrito = [];
        }
    }
    actualizarContadorCarrito();
}

// ====================================================
// OPERACIONES DEL CARRITO
// ====================================================

function agregarAlCarrito(id, nombre, precio) {
    const existe = carrito.find(item => item.id === id);
    
    if (existe) {
        existe.cantidad++;
        mostrarToast(`${nombre} - Cantidad actualizada a ${existe.cantidad}`, 'success');
    } else {
        carrito.push({ id, nombre, precio, cantidad: 1 });
        mostrarToast(`${nombre} agregado al carrito`, 'success');
    }
    
    guardarCarrito();
    actualizarContadorCarrito();
}

function eliminarDelCarrito(id) {
    const producto = carrito.find(item => item.id === id);
    if (producto) {
        carrito = carrito.filter(item => item.id !== id);
        guardarCarrito();
        mostrarToast(`${producto.nombre} eliminado del carrito`, 'info');
        actualizarContadorCarrito();
        actualizarModalCarrito();
    }
}

function actualizarCantidad(id, nuevaCantidad) {
    const item = carrito.find(item => item.id === id);
    if (item && nuevaCantidad > 0) {
        item.cantidad = nuevaCantidad;
        guardarCarrito();
        actualizarContadorCarrito();
        actualizarModalCarrito();
    } else if (nuevaCantidad <= 0) {
        eliminarDelCarrito(id);
    }
}

// ====================================================
// ACTUALIZACIÓN DE UI
// ====================================================

function actualizarContadorCarrito() {
    const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const badges = document.querySelectorAll('.badge, #cartCount');
    badges.forEach(badge => {
        if (badge) badge.textContent = total;
    });
}

function actualizarModalCarrito() {
    const container = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    
    if (!container) return;
    
    if (carrito.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <span class="cart-empty-icon">🛒</span>
                <p>Tu carrito está vacío</p>
                <small>Agrega productos desde el catálogo</small>
            </div>
        `;
        if (totalEl) totalEl.innerHTML = 'Total: $0.00';
        return;
    }
    
    let html = '';
    let total = 0;
    
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <strong>${escapeHtml(item.nombre)}</strong>
                    <div class="cart-item-price">$${item.precio.toFixed(2)} c/u</div>
                </div>
                <div class="cart-item-actions">
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="actualizarCantidad(${item.id}, ${item.cantidad - 1})">-</button>
                        <span>${item.cantidad}</span>
                        <button class="qty-btn" onclick="actualizarCantidad(${item.id}, ${item.cantidad + 1})">+</button>
                    </div>
                    <div class="cart-item-subtotal">$${subtotal.toFixed(2)}</div>
                    <button class="cart-remove" onclick="eliminarDelCarrito(${item.id})" title="Eliminar">🗑️</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    if (totalEl) totalEl.innerHTML = `Total: $${total.toFixed(2)}`;
}

// ====================================================
// WHATSAPP Y PERSISTENCIA
// ====================================================

function enviarPedidoWhatsApp() {
    if (carrito.length === 0) {
        mostrarToast('El carrito está vacío', 'error');
        return;
    }
    
    // Obtener datos del usuario logueado
    const userName = localStorage.getItem('userName') || 'Cliente';
    const userPhone = localStorage.getItem('userPhone') || '';
    
    let mensaje = '🛍️ *NUEVO PEDIDO - HOTCLICK*%0A';
    mensaje += `👤 *Cliente:* ${userName}%0A`;
    if (userPhone) mensaje += `📞 *Teléfono:* ${userPhone}%0A`;
    mensaje += `📅 *Fecha:* ${new Date().toLocaleString('es-CR')}%0A%0A`;
    mensaje += '*PRODUCTOS SOLICITADOS:*%0A';
    mensaje += '─' + '─'.repeat(20) + '%0A';
    
    let total = 0;
    
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        mensaje += `• ${item.cantidad}x ${item.nombre}%0A`;
        mensaje += `  $${item.precio.toFixed(2)} c/u → $${subtotal.toFixed(2)}%0A`;
    });
    
    mensaje += '─' + '─'.repeat(20) + '%0A';
    mensaje += `💰 *TOTAL: $${total.toFixed(2)}*%0A%0A`;
    mensaje += '_Gracias por tu compra. Te contactaremos pronto._';
    
    // Abrir WhatsApp
    const numeroWhatsApp = '50689745370';
    window.open(`https://wa.me/${numeroWhatsApp}?text=${mensaje}`, '_blank');
}

function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function vaciarCarrito() {
    if (confirm('¿Estás seguro de vaciar el carrito?')) {
        carrito = [];
        guardarCarrito();
        actualizarContadorCarrito();
        actualizarModalCarrito();
        mostrarToast('Carrito vaciado', 'info');
    }
}