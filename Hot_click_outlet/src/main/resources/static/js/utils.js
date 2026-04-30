/**
 * HOTCLICK - Utilidades
 * Funciones de uso general
 * @version 1.0
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
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// ====================================================
// FORMATEADORES
// ====================================================

function formatearPrecio(precio) {
    return '$' + parseFloat(precio).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatearFecha(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CR');
}

// ====================================================
// ESCAPE HTML (seguridad)
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