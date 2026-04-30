/**
 * HOTCLICK - Panel de AdministraciÃ³n
 * Funciones para Admin IT y Admin Cliente
 * @version 1.0
 */

// ====================================================
// VERIFICAR ROL DE ADMIN
// ====================================================

/**
 * Verifica si el usuario tiene permisos de administrador
 * @returns {boolean} - true si es admin, false si no
 */
function verificarAccesoAdmin() {
    const token = getToken();
    const userRole = localStorage.getItem('userRole');
    
    if (!token || (userRole !== 'ADMIN_IT' && userRole !== 'ADMIN_CLIENTE')) {
        mostrarToast('Acceso denegado. Se requiere rol de administrador.', 'error');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
        return false;
    }
    return true;
}

// ====================================================
// ESTADÃSTICAS DEL DASHBOARD
// ====================================================

/**
 * Carga las estadÃ­sticas para el dashboard de administraciÃ³n
 */
async function cargarEstadisticasAdmin() {
    const statsElements = {
        totalUsuarios: document.getElementById('totalUsuarios'),
        totalNegocios: document.getElementById('totalNegocios'),
        totalProductos: document.getElementById('totalProductos'),
        totalVentas: document.getElementById('totalVentas'),
        ventasMes: document.getElementById('ventasMes')
    };
    
    try {
        // Datos de ejemplo (conectar con backend real despuÃ©s)
        if (statsElements.totalUsuarios) statsElements.totalUsuarios.innerText = '156';
        if (statsElements.totalNegocios) statsElements.totalNegocios.innerText = '23';
        if (statsElements.totalProductos) statsElements.totalProductos.innerText = '1,284';
        if (statsElements.totalVentas) statsElements.totalVentas.innerText = '$45,678';
        if (statsElements.ventasMes) statsElements.ventasMes.innerText = '$12,345';
        
    } catch (error) {
        console.error('Error cargando estadÃ­sticas:', error);
        mostrarToast('Error al cargar estadÃ­sticas', 'error');
    }
}

// ====================================================
// GESTIÃ“N DE USUARIOS (Admin IT)
// ====================================================

/**
 * Carga la lista de usuarios para el panel de admin
 */
async function cargarUsuariosAdmin() {
    const tbody = document.getElementById('usuariosTable');
    if (!tbody) return;
    
    try {
        // Datos de ejemplo
        const usuariosMock = [
            { id: 1, nombre: 'Admin Sistema', email: 'admin@hotclick.com', rol: 'ADMIN_IT', estado: 'ACTIVO' },
            { id: 2, nombre: 'Tech Store CR', email: 'ventas@techstore.com', rol: 'ADMIN_CLIENTE', estado: 'ACTIVO' },
            { id: 3, nombre: 'MarÃ­a GarcÃ­a', email: 'maria@gmail.com', rol: 'USUARIO_FINAL', estado: 'ACTIVO' }
        ];
        
        tbody.innerHTML = usuariosMock.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${escapeHtml(u.nombre)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td><span class="badge-role ${u.rol === 'ADMIN_IT' ? 'badge-it' : u.rol === 'ADMIN_CLIENTE' ? 'badge-client' : 'badge-user'}">${u.rol.replace('_', ' ')}</span></td>
                <td><span class="badge-status ${u.estado === 'ACTIVO' ? 'badge-active' : 'badge-inactive'}">${u.estado}</span></td>
                <td class="table-actions">
                    <button class="btn-icon" onclick="editarUsuario(${u.id})" title="Editar">âœï¸</button>
                    <button class="btn-icon btn-danger" onclick="eliminarUsuario(${u.id})" title="Eliminar">ðŸ—‘ï¸</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="error">Error cargando usuarios</td></tr>';
    }
}

/**
 * Edita un usuario
 * @param {number} id - ID del usuario a editar
 */
function editarUsuario(id) {
    // Implementar modal de ediciÃ³n
    mostrarToast(`Editar usuario ${id}`, 'info');
}

/**
 * Elimina un usuario
 * @param {number} id - ID del usuario a eliminar
 */
function eliminarUsuario(id) {
    if (confirm('Â¿EstÃ¡s seguro de eliminar este usuario?')) {
        mostrarToast(`Usuario ${id} eliminado`, 'success');
    }
}

// ====================================================
// GESTIÃ“N DE PRODUCTOS (Admin Cliente)
// ====================================================

/**
 * Carga la lista de productos del negocio
 */
async function cargarProductosAdmin() {
    const tbody = document.getElementById('productosAdminTable');
    if (!tbody) return;
    
    try {
        tbody.innerHTML = productosMock.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${escapeHtml(p.nombre)}</td>
                <td>$${p.precio.toFixed(2)}</td>
                <td>${p.stock}</td>
                <td><span class="badge-status badge-active">ACTIVO</span></td>
                <td class="table-actions">
                    <button class="btn-icon" onclick="editarProducto(${p.id})" title="Editar">âœï¸</button>
                    <button class="btn-icon btn-danger" onclick="eliminarProducto(${p.id})" title="Eliminar">ðŸ—‘ï¸</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando productos:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="error">Error cargando productos</td></tr>';
    }
}

function editarProducto(id) {
    mostrarToast(`Editar producto ${id}`, 'info');
}

function eliminarProducto(id) {
    if (confirm('Â¿EstÃ¡s seguro de eliminar este producto?')) {
        mostrarToast(`Producto ${id} eliminado`, 'success');
    }
}

// ====================================================
// GESTIÃ“N DE BODEGAS
// ====================================================

/**
 * Carga la lista de bodegas
 */
async function cargarBodegasAdmin() {
    const tbody = document.getElementById('bodegasAdminTable');
    if (!tbody) return;
    
    const bodegasMock = [
        { id: 1, nombre: 'Bodega Central', direccion: 'San JosÃ©', telefono: '2222-3333', estado: 'ACTIVO' },
        { id: 2, nombre: 'Bodega Alajuela', direccion: 'Alajuela Centro', telefono: '4444-5555', estado: 'ACTIVO' }
    ];
    
    tbody.innerHTML = bodegasMock.map(b => `
        <tr>
            <td>${b.id}</td>
            <td>${escapeHtml(b.nombre)}</td>
            <td>${escapeHtml(b.direccion)}</td>
            <td>${b.telefono}</td>
            <td><span class="badge-status badge-active">${b.estado}</span></td>
            <td class="table-actions">
                <button class="btn-icon" onclick="editarBodega(${b.id})">âœï¸</button>
                <button class="btn-icon btn-danger" onclick="eliminarBodega(${b.id})">ðŸ—‘ï¸</button>
            </td>
        </tr>
    `).join('');
}

function editarBodega(id) {
    mostrarToast(`Editar bodega ${id}`, 'info');
}

function eliminarBodega(id) {
    if (confirm('Â¿Eliminar esta bodega?')) {
        mostrarToast(`Bodega ${id} eliminada`, 'success');
    }
}

// ====================================================
// GESTIÃ“N DE CATEGORÃAS
// ====================================================

function cargarCategoriasAdmin() {
    const tbody = document.getElementById('categoriasAdminTable');
    if (!tbody) return;
    
    const categoriasMock = [
        { id: 1, nombre: 'ElectrÃ³nica', descripcion: 'Productos electrÃ³nicos', estado: 'ACTIVO' },
        { id: 2, nombre: 'Hogar', descripcion: 'ArtÃ­culos para el hogar', estado: 'ACTIVO' },
        { id: 3, nombre: 'Deportes', descripcion: 'Equipo deportivo', estado: 'ACTIVO' }
    ];
    
    tbody.innerHTML = categoriasMock.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${escapeHtml(c.nombre)}</td>
            <td>${escapeHtml(c.descripcion)}</td>
            <td><span class="badge-status badge-active">${c.estado}</span></td>
            <td class="table-actions">
                <button class="btn-icon" onclick="editarCategoria(${c.id})">âœï¸</button>
                <button class="btn-icon btn-danger" onclick="eliminarCategoria(${c.id})">ðŸ—‘ï¸</button>
            </td>
        </tr>
    `).join('');
}

function editarCategoria(id) {
    mostrarToast(`Editar categorÃ­a ${id}`, 'info');
}

function eliminarCategoria(id) {
    if (confirm('Â¿Eliminar esta categorÃ­a?')) {
        mostrarToast(`CategorÃ­a ${id} eliminada`, 'success');
    }
}

// ====================================================
// REPORTES Y FINANZAS
// ====================================================

function cargarReportesFinancieros() {
    const container = document.getElementById('reportesContainer');
    if (!container) return;
    
    const reportesMock = [
        { mes: 'Enero 2026', ventas: 12500, inversion: 8200, utilidad: 4300, margen: '34.4%' },
        { mes: 'Febrero 2026', ventas: 14800, inversion: 9500, utilidad: 5300, margen: '35.8%' },
        { mes: 'Marzo 2026', ventas: 16700, inversion: 10800, utilidad: 5900, margen: '35.3%' }
    ];
    
    container.innerHTML = `
        <table class="data-table">
            <thead><tr><th>Mes</th><th>Ventas</th><th>InversiÃ³n</th><th>Utilidad</th><th>Margen</th></tr></thead>
            <tbody>
                ${reportesMock.map(r => `
                    <tr>
                        <td>${r.mes}</td>
                        <td>$${r.ventas.toLocaleString()}</td>
                        <td>$${r.inversion.toLocaleString()}</td>
                        <td>$${r.utilidad.toLocaleString()}</td>
                        <td class="text-success">${r.margen}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Exponer funciones
window.verificarAccesoAdmin = verificarAccesoAdmin;
window.cargarEstadisticasAdmin = cargarEstadisticasAdmin;
window.cargarUsuariosAdmin = cargarUsuariosAdmin;
window.cargarProductosAdmin = cargarProductosAdmin;
window.cargarBodegasAdmin = cargarBodegasAdmin;
window.cargarCategoriasAdmin = cargarCategoriasAdmin;
window.cargarReportesFinancieros = cargarReportesFinancieros;
