/**
 * HOTCLICK - Autenticación UI
 * Login, registro y sesión
 * @version 2.0
 */

// ====================================================
// INICIAR SESIÓN
// ====================================================

async function iniciarSesion() {
    const correo    = document.getElementById('loginCorreo').value;
    const contrasena = document.getElementById('loginPassword').value;

    if (!correo || !contrasena) { mostrarToast('Complete todos los campos', 'error'); return; }

    mostrarToast('Iniciando sesión...', 'info');
    const result = await apiLogin(correo, contrasena);

    if (result.success) {
        mostrarToast(`✅ Bienvenido`, 'success');
        cerrarModal('loginModal');
        actualizarIconoSesion();

        const rol = localStorage.getItem('userRole');
        if (rol === 'ADMIN_IT' || rol === 'ADMIN_CLIENTE') {
            mostrarModalModoAdmin();
        } else {
            // cliente normal — ir a perfil
            setTimeout(() => { window.location.href = 'perfil.html'; }, 800);
        }
    } else {
        mostrarToast(result.message || 'Credenciales inválidas', 'error');
    }
}

// ====================================================
// MODAL ELECCIÓN MODO ADMIN
// ====================================================

function mostrarModalModoAdmin() {
    // Eliminar si ya existe
    const viejo = document.getElementById('modoAdminModal');
    if (viejo) viejo.remove();

    const modal = document.createElement('div');
    modal.id = 'modoAdminModal';
    modal.style.cssText = `
        position:fixed;inset:0;z-index:9999;
        display:flex;align-items:center;justify-content:center;
        background:rgba(0,0,0,.55);backdrop-filter:blur(4px);
    `;
    modal.innerHTML = `
        <div style="
            background:#fff;border-radius:20px;padding:40px 36px;
            max-width:420px;width:90%;text-align:center;
            box-shadow:0 24px 60px rgba(0,0,0,.25);
        ">
            <div style="font-size:2.4rem;margin-bottom:8px;">🔐</div>
            <h2 style="font-size:1.35rem;font-weight:800;color:#0d0d0d;margin-bottom:6px;">Acceso de Administrador</h2>
            <p style="color:#666;font-size:.9rem;margin-bottom:32px;">
                Detectamos que tienes permisos de administrador.<br>¿Cómo deseas ingresar?
            </p>
            <div style="display:flex;flex-direction:column;gap:12px;">
                <button onclick="entrarComoAdmin()" style="
                    padding:14px 24px;border:none;border-radius:12px;
                    background:linear-gradient(135deg,#1a73e8,#0d47a1);
                    color:#fff;font-size:1rem;font-weight:700;cursor:pointer;
                    display:flex;align-items:center;justify-content:center;gap:10px;
                ">
                    🛠️ Entrar como Administrador
                </button>
                <button onclick="entrarComoCliente()" style="
                    padding:14px 24px;border:2px solid #e0e0e0;border-radius:12px;
                    background:#fff;color:#333;font-size:1rem;font-weight:600;cursor:pointer;
                    display:flex;align-items:center;justify-content:center;gap:10px;
                ">
                    🛒 Entrar como Cliente
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function entrarComoAdmin() {
    document.getElementById('modoAdminModal')?.remove();
    localStorage.setItem('modoActual', 'admin');
    // Detectar ruta relativa correcta
    const esAdmin = window.location.pathname.includes('/admin/');
    const base = esAdmin ? '' : '../';
    window.location.href = base + 'admin/admin-dashboard.html';
}

function entrarComoCliente() {
    document.getElementById('modoAdminModal')?.remove();
    localStorage.setItem('modoActual', 'cliente');
    window.location.href = 'perfil.html';
}

// ====================================================
// REGISTRAR USUARIO
// ====================================================

async function registrarUsuario() {
    const usuario = {
        nombre:         document.getElementById('regNombre').value,
        correo:         document.getElementById('regCorreo').value,
        telefono:       document.getElementById('regTelefono').value,
        identificacion: document.getElementById('regIdentificacion')?.value || '',
        contrasenaHash: document.getElementById('regPassword').value
    };

    if (!usuario.nombre || !usuario.correo || !usuario.telefono || !usuario.contrasenaHash) {
        mostrarToast('Complete todos los campos obligatorios', 'error'); return;
    }

    mostrarToast('Registrando usuario...', 'info');
    const result = await apiRegister(usuario);

    if (result.success) {
        mostrarToast('✅ Registro exitoso. Ahora inicia sesión', 'success');
        cerrarModal('registerModal');
        abrirModal('loginModal');
        document.getElementById('regNombre').value    = '';
        document.getElementById('regCorreo').value    = '';
        document.getElementById('regTelefono').value  = '';
        document.getElementById('regPassword').value  = '';
    } else {
        mostrarToast(result.message || 'Error al registrar', 'error');
    }
}

// ====================================================
// CERRAR SESIÓN
// ====================================================

function cerrarSesion() {
    apiLogout();
    localStorage.removeItem('modoActual');
    actualizarIconoSesion();
    mostrarToast('Sesión cerrada correctamente', 'success');

    if (window.location.pathname.includes('/admin/')) {
        setTimeout(() => { window.location.href = '../pages/index.html'; }, 1000);
    }
}

// ====================================================
// ACTUALIZAR ICONO DE SESIÓN
// ====================================================

function actualizarIconoSesion() {
    const token    = getToken();
    const userBtn  = document.getElementById('userBtn');
    const mobileUserBtn = document.getElementById('mobileUserBtn');

    if (userBtn) {
        userBtn.textContent = token ? 'Cerrar sesión' : 'Iniciar sesión';
        userBtn.classList.toggle('logged-in', !!token);
    }
    if (mobileUserBtn) {
        mobileUserBtn.textContent = token ? 'Cerrar sesión' : 'Iniciar sesión';
    }
}

// ====================================================
// VERIFICAR SESIÓN
// ====================================================

function verificarSesion() {
    actualizarIconoSesion();
}

// ── Auto-init: actualiza estado de sesión en cada página ──
document.addEventListener('DOMContentLoaded', () => {
    actualizarIconoSesion();
});
