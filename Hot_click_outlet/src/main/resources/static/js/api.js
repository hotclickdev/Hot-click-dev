/**
 * HOTCLICK - API
 * Comunicación con backend Spring Boot
 * @version 1.0
 */

// ====================================================
// CONFIGURACIÓN
// ====================================================

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8080/api'
    : '/api';

// ====================================================
// TOKEN JWT
// ====================================================

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    if (token) {
        localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('token');
    }
}

function getAuthHeaders() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ====================================================
// HEALTH CHECK
// ====================================================

async function verificarBackend() {
    const statusEl = document.getElementById('backendStatus');
    if (!statusEl) return false;
    
    try {
        const response = await fetch(`${API_URL}/health`);
        
        if (response.ok) {
            const data = await response.json();
            statusEl.innerHTML = `✅ Conectado - ${data.service} v${data.version}`;
            statusEl.style.color = '#28a745';
            return true;
        } else {
            statusEl.innerHTML = '⚠️ Error en el servidor';
            statusEl.style.color = '#ff9800';
            return false;
        }
    } catch (error) {
        console.error('Error conectando al backend:', error);
        statusEl.innerHTML = '❌ Sin conexión. Asegúrate que el backend esté corriendo';
        statusEl.style.color = '#dc3545';
        return false;
    }
}

// ====================================================
// AUTENTICACIÓN
// ====================================================

async function apiLogin(correo, contrasena) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, contrasena })
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
            setToken(data.token);
            localStorage.setItem('userRole', data.rol || 'USUARIO_FINAL');
            localStorage.setItem('userId', data.id);
            localStorage.setItem('userName', data.nombre || 'Usuario');
            return { success: true, data };
        } else {
            return { success: false, message: data.mensaje || 'Credenciales inválidas' };
        }
    } catch (error) {
        console.error('Error en login:', error);
        return { success: false, message: 'Error de conexión' };
    }
}

async function apiRegister(usuario) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(usuario)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return { success: true, data };
        } else {
            return { success: false, message: data.mensaje || 'Error al registrar' };
        }
    } catch (error) {
        console.error('Error en registro:', error);
        return { success: false, message: 'Error de conexión' };
    }
}

function apiLogout() {
    setToken(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
}

// ====================================================
// PRODUCTOS
// ====================================================

async function apiObtenerProductos(page = 0, size = 10) {
    try {
        const response = await fetch(`${API_URL}/productos?page=${page}&size=${size}`);
        
        if (response.ok) {
            const data = await response.json();
            const productos = data.content || data.data || [];
            return {
                success: true,
                content: productos,
                totalPages: data.totalPages || 1,
                totalElements: data.totalElements || productos.length
            };
        }
        return { success: false, content: [], totalPages: 1 };
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        return { success: false, content: [], totalPages: 1 };
    }
}

async function apiObtenerProducto(id) {
    try {
        const response = await fetch(`${API_URL}/productos/${id}`);
        if (response.ok) return await response.json();
        return null;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// ====================================================
// ADMIN — DASHBOARD
// ====================================================

async function apiObtenerDashboard() {
    try {
        const res = await fetch(`${API_URL}/admin/dashboard`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) return { success: false, message: data.message || 'Error al obtener dashboard' };
        return { success: true, data: data.data };
    } catch (e) {
        console.error('Dashboard error:', e);
        return { success: false, message: 'Error de conexión' };
    }
}