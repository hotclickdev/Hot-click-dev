/**
 * HOTCLICK - Utilidades
 * @version 2.0
 */

// ====================================================
// TOAST NOTIFICATIONS
// ====================================================

function mostrarToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ====================================================
// MODALES
// ====================================================

function abrirModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function cerrarModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

// ====================================================
// FORMATEADORES
// ====================================================

function formatearPrecio(precio) {
    return '$' + parseFloat(precio).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatearFecha(fecha) {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CR');
}

// ====================================================
// ESCAPE HTML
// ====================================================

function escapeHtml(texto) {
    if (!texto) return '';
    return texto
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ====================================================
// MENÚ MÓVIL — panel lateral + overlay + bottom nav
// ====================================================

const _MM_ICONS = {
    'index.html': '🏠', 'productos.html': '📦', 'categorias.html': '🗂️',
    'nosotros.html': '👥', 'contacto.html': '📬', 'carrito.html': '🛒',
    'perfil.html': '👤', 'login.html': '🔑', 'registro.html': '📝',
    'escaner.html': '📷',
};

function _mmIcon(href) {
    const file = (href || '').split('/').pop().split('?')[0];
    return _MM_ICONS[file] || '→';
}

function _currentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
}

function _cartTotal() {
    return (JSON.parse(localStorage.getItem('carrito') || '[]'))
        .reduce((s, i) => s + (i.cantidad || 1), 0);
}

document.addEventListener('DOMContentLoaded', function () {
    const btn  = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;

    const currentPage = _currentPage();

    // Collect existing links before rebuilding
    const existingLinks = Array.from(menu.querySelectorAll('a'));

    // Build nav links HTML
    const navHTML = existingLinks.map(a => {
        const href = a.getAttribute('href') || '#';
        const icon = _mmIcon(href);
        const file = href.split('/').pop().split('?')[0];
        const active = file === currentPage ? ' active' : '';
        return `<a href="${escapeHtml(href)}"${active ? ' class="active"' : ''}>` +
               `<span class="mm-icon">${icon}</span>${escapeHtml(a.textContent.trim())}</a>`;
    }).join('');

    // Determine account state
    const token   = localStorage.getItem('token');
    const nombre  = localStorage.getItem('userNombre') || localStorage.getItem('userName') || '';
    const acctHref = token ? 'perfil.html' : 'login.html';
    const acctLabel = token ? 'Ver perfil' : 'Iniciar sesión';
    const userLine = token && nombre
        ? `<span style="font-size:1rem;">👤</span><strong>${escapeHtml(nombre)}</strong>`
        : `<span style="font-size:1rem;">👤</span><span>Inicia sesión</span>`;

    // Rebuild menu with new panel structure
    menu.innerHTML =
        `<div class="mobile-menu-header">
            <div class="mobile-menu-logo">
                <span style="background:var(--c-navy);color:#fff;font-size:.72rem;font-weight:900;padding:5px 8px;border-radius:6px;font-family:var(--font-display);letter-spacing:.05em;">HC</span>
                <span style="font-family:var(--font-display);font-weight:800;font-size:.98rem;color:var(--c-navy);letter-spacing:-.02em;">HOTCLICK</span>
            </div>
            <button class="mobile-menu-close" id="mobileMenuClose" aria-label="Cerrar menú">✕</button>
        </div>
        <nav class="mobile-menu-nav">${navHTML}</nav>
        <div class="mobile-menu-footer">
            <div class="mobile-menu-user">${userLine}</div>
            <a href="${acctHref}" class="btn btn-primary" style="text-align:center;text-decoration:none;min-height:44px;display:flex;align-items:center;justify-content:center;">${acctLabel}</a>
        </div>`;

    // Inject overlay
    let overlay = document.getElementById('mobileMenuOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        overlay.id = 'mobileMenuOverlay';
        document.body.appendChild(overlay);
    }

    function openMenu() {
        menu.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
        menu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.contains('active') ? closeMenu() : openMenu();
    });

    overlay.addEventListener('click', closeMenu);
    document.getElementById('mobileMenuClose').addEventListener('click', closeMenu);

    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

    // Inject bottom nav
    if (!document.getElementById('bottomNav')) {
        const count = _cartTotal();
        const badge = count > 0
            ? `<span class="bn-cart-badge" id="bnCartBadge">${count}</span>`
            : `<span class="bn-cart-badge" id="bnCartBadge" style="display:none">${count}</span>`;

        const bnItems = [
            { href: 'index.html',     icon: '🏠', label: 'Inicio' },
            { href: 'productos.html', icon: '📦', label: 'Tienda' },
            { href: 'carrito.html',   icon: '🛒', label: 'Carrito', badge: badge },
            { href: token ? 'perfil.html' : 'login.html', icon: '👤', label: 'Cuenta' },
        ];

        const bnHTML = bnItems.map(item => {
            const file = item.href;
            const active = file === currentPage ? ' active' : '';
            return `<a href="${item.href}" class="bottom-nav-item${active}">` +
                   `<span class="bn-icon">${item.icon}${item.badge || ''}</span>` +
                   `<span>${item.label}</span></a>`;
        }).join('');

        const nav = document.createElement('nav');
        nav.id = 'bottomNav';
        nav.className = 'bottom-nav';
        nav.setAttribute('aria-label', 'Navegación principal');
        nav.innerHTML = bnHTML;
        document.body.appendChild(nav);
    }
});

// ====================================================
// SYNC BOTTOM NAV CART BADGE (llamar desde cart.js)
// ====================================================

function actualizarBottomNavCarrito() {
    const badge = document.getElementById('bnCartBadge');
    if (!badge) return;
    const count = _cartTotal();
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
}
