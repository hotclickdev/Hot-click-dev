/**
 * HOTCLICK - Modales Reutilizables
 * Plantillas de modales para todo el sistema
 * @version 1.0
 */

// ====================================================
// MODAL DE CONFIRMACIÓN
// ====================================================

function mostrarModalConfirmacion(titulo, mensaje, onConfirm) {
    // Verificar si ya existe el modal
    let modal = document.getElementById('confirmModal');
    
    if (!modal) {
        // Crear modal si no existe
        modal = document.createElement('div');
        modal.id = 'confirmModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 id="confirmTitle">Confirmar</h3>
                    <button class="modal-close" onclick="cerrarModal('confirmModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="confirmMessage">¿Estás seguro de realizar esta acción?</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="cerrarModal('confirmModal')">Cancelar</button>
                    <button class="btn btn-primary" id="confirmBtn">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Agregar evento al botón
        const confirmBtn = document.getElementById('confirmBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                cerrarModal('confirmModal');
                if (typeof onConfirm === 'function') onConfirm();
            });
        }
    }
    
    // Actualizar contenido
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    if (titleEl) titleEl.innerText = titulo || 'Confirmar';
    if (messageEl) messageEl.innerText = mensaje || '¿Estás seguro?';
    
    abrirModal('confirmModal');
}

// ====================================================
// MODAL DE ALERTA
// ====================================================

function mostrarModalAlerta(titulo, mensaje, tipo = 'info') {
    let modal = document.getElementById('alertModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'alertModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 id="alertTitle">Información</h3>
                    <button class="modal-close" onclick="cerrarModal('alertModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="alertMessage">Mensaje informativo</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="cerrarModal('alertModal')">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const titleEl = document.getElementById('alertTitle');
    const messageEl = document.getElementById('alertMessage');
    
    const iconos = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    if (titleEl) titleEl.innerText = `${iconos[tipo] || 'ℹ️'} ${titulo || 'Información'}`;
    if (messageEl) messageEl.innerText = mensaje || '';
    
    abrirModal('alertModal');
}

// ====================================================
// MODAL DE CARGA (LOADING)
// ====================================================

function mostrarModalCarga(mensaje = 'Cargando...') {
    let modal = document.getElementById('loadingModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'loadingModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 300px; text-align: center;">
                <div class="modal-body">
                    <div class="loading-spinner"></div>
                    <p id="loadingMessage">Cargando...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Agregar estilos del spinner
        const style = document.createElement('style');
        style.textContent = `
            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 4px solid var(--gris-borde);
                border-top-color: var(--rojo);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 1rem auto;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    const messageEl = document.getElementById('loadingMessage');
    if (messageEl) messageEl.innerText = mensaje;
    
    abrirModal('loadingModal');
}

function cerrarModalCarga() {
    cerrarModal('loadingModal');
}