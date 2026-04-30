/**
 * HOTCLICK - Autenticación UI
 * Login, registro y sesión
 * @version 1.0
 */

// ====================================================
// INICIAR SESIÓN
// ====================================================

async function iniciarSesion() {
    const correo = document.getElementById('loginCorreo').value;
    const contrasena = document.getElementById('loginPassword').value;
    
    if (!correo || !contrasena) {
        mostrarToast('Complete todos los campos', 'error');
        return;
    }
    
    mostrarToast('Iniciando sesión...', 'info');
    
    const result = await apiLogin(correo, contrasena);
    
    if (result.success) {
        mostrarToast(`✅ Bienvenido ${result.data.nombre || 'Usuario'}`, 'success');
        cerrarModal('loginModal');
        actualizarIconoSesion();
        
        const rol = localStorage.getItem('userRole');
        if (rol === 'ADMIN_IT' || rol === 'ADMIN_CLIENTE') {
            mostrarToast('Redirigiendo al panel de administración...', 'info');
            setTimeout(() => { window.location.href = '../admin/admin-dashboard.html'; }, 1500);
        }
    } else {
        mostrarToast(result.message || 'Credenciales inválidas', 'error');
    }
}

// ====================================================
// REGISTRAR USUARIO
// ====================================================

async function registrarUsuario() {
    const usuario = {
        nombre: document.getElementById('regNombre').value,
        correo: document.getElementById('regCorreo').value,
        telefono: document.getElementById('regTelefono').value,
        identificacion: document.getElementById('regIdentificacion')?.value || '',
        contrasenaHash: document.getElementById('regPassword').value
    };
    
    if (!usuario.nombre || !usuario.correo || !usuario.telefono || !usuario.contrasenaHash) {
        mostrarToast('Complete todos los campos obligatorios', 'error');
        return;
    }
    
    mostrarToast('Registrando usuario...', 'info');
    
    const result = await apiRegister(usuario);
    
    if (result.success) {
        mostrarToast('✅ Registro exitoso. Ahora inicia sesión', 'success');
        cerrarModal('registerModal');
        abrirModal('loginModal');
        
        // Limpiar formulario
        document.getElementById('regNombre').value = '';
        document.getElementById('regCorreo').value = '';
        document.getElementById('regTelefono').value = '';
        document.getElementById('regPassword').value = '';
    } else {
        mostrarToast(result.message || 'Error al registrar', 'error');
    }
}

// ====================================================
// CERRAR SESIÓN
// ====================================================

function cerrarSesion() {
    apiLogout();
    actualizarIconoSesion();
    mostrarToast('Sesión cerrada correctamente', 'success');
    
    if (window.location.pathname.includes('admin')) {
        setTimeout(() => { window.location.href = '../pages/index.html'; }, 1000);
    }
}

// ====================================================
// ACTUALIZAR ICONO DE SESIÓN
// ====================================================

function actualizarIconoSesion() {
    const token = getToken();
    const userBtn = document.getElementById('userBtn');
    const mobileUserBtn = document.getElementById('mobileUserBtn');
    
    if (userBtn) {
        userBtn.innerHTML = token ? '👤✅' : '👤';
        userBtn.title = token ? 'Mi cuenta' : 'Iniciar sesión';
    }
    
    if (mobileUserBtn) {
        mobileUserBtn.textContent = token ? 'Cerrar Sesión' : 'Iniciar Sesión';
    }
}

// ====================================================
// VERIFICAR SESIÓN
// ====================================================

function verificarSesion() {
    actualizarIconoSesion();
}