/**
 * HOTCLICK - Productos
 * Carga, filtros, paginación y visualización
 * @version 1.0
 */

// ====================================================
// VARIABLES GLOBALES
// ====================================================

let todosLosProductos = [];
let paginaActual = 0;
let totalPaginas = 0;
let productosPorPagina = 6;
let categoriaActual = '';
let busquedaActual = '';

// Datos MOCK (respaldo si no hay backend)
const productosMock = [
    { id: 1, nombre: 'Laptop Gamer Pro', precio: 850.00, stock: 10, categoria: 'electronica', descripcion: 'Procesador Intel i7, 16GB RAM, SSD 512GB', amazonLink: 'https://amazon.com' },
    { id: 2, nombre: 'Mouse Inalámbrico', precio: 29.99, stock: 50, categoria: 'electronica', descripcion: 'Mouse ergonómico con batería de larga duración', amazonLink: 'https://amazon.com' },
    { id: 3, nombre: 'Teclado Mecánico RGB', precio: 89.99, stock: 25, categoria: 'electronica', descripcion: 'Switches azules, retroiluminación RGB', amazonLink: 'https://amazon.com' },
    { id: 4, nombre: 'Audífonos Bluetooth', precio: 59.99, stock: 30, categoria: 'electronica', descripcion: 'Cancelación de ruido, 20h de batería', amazonLink: 'https://amazon.com' },
    { id: 5, nombre: 'Monitor 24" Full HD', precio: 199.99, stock: 15, categoria: 'electronica', descripcion: 'Panel IPS, 75Hz, HDMI/DisplayPort', amazonLink: 'https://amazon.com' }
];

// ====================================================
// CARGA DE PRODUCTOS
// ====================================================

async function cargarProductosDestacados() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading">📦 Cargando productos...</div>';
    
    try {
        const result = await apiObtenerProductos(0, 4);
        if (result.success && result.content.length > 0) {
            mostrarProductosEnGrid(grid, result.content);
        } else {
            mostrarProductosEnGrid(grid, productosMock.slice(0, 4));
        }
    } catch (error) {
        console.error('Error cargando destacados:', error);
        mostrarProductosEnGrid(grid, productosMock.slice(0, 4));
    }
}

async function cargarTodosLosProductos(page = 0) {
    const grid = document.getElementById('allProductsGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading">📦 Cargando productos...</div>';
    
    try {
        const result = await apiObtenerProductos(page, productosPorPagina);
        
        if (result.success && result.content.length > 0) {
            todosLosProductos = result.content;
            totalPaginas = result.totalPages;
            paginaActual = page;
            mostrarProductosEnGrid(grid, todosLosProductos);
        } else {
            // Usar MOCK si no hay datos
            todosLosProductos = productosMock;
            totalPaginas = Math.ceil(productosMock.length / productosPorPagina);
            const inicio = paginaActual * productosPorPagina;
            const paginados = productosMock.slice(inicio, inicio + productosPorPagina);
            mostrarProductosEnGrid(grid, paginados);
        }
        actualizarPaginacion();
    } catch (error) {
        console.error('Error cargando productos:', error);
        todosLosProductos = productosMock;
        totalPaginas = Math.ceil(productosMock.length / productosPorPagina);
        const inicio = paginaActual * productosPorPagina;
        const paginados = productosMock.slice(inicio, inicio + productosPorPagina);
        mostrarProductosEnGrid(grid, paginados);
        actualizarPaginacion();
    }
}

// ====================================================
// RENDERIZADO
// ====================================================

function mostrarProductosEnGrid(grid, productos) {
    if (!productos || productos.length === 0) {
        grid.innerHTML = '<div class="loading">📭 No hay productos disponibles</div>';
        return;
    }
    
    let html = '';
    
    for (let i = 0; i < productos.length; i++) {
        const p = productos[i];
        const id = p.id;
        const nombre = p.nombreProducto || p.nombre;
        const precio = p.precioVenta || p.precio;
        const stock = p.stockActual || p.stock;
        const descripcion = p.descripcionCorta || p.descripcion || 'Producto de alta calidad';
        
        html += `
            <div class="product-card" data-id="${id}">
                <div class="product-image">
                    <span>📦</span>
                    ${stock > 0 ? '<span class="stock-badge">✓ Stock</span>' : '<span class="stock-badge out">Agotado</span>'}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${escapeHtml(nombre)}</h3>
                    <div class="product-price">$${precio.toFixed(2)}</div>
                    <div class="product-desc">${escapeHtml(descripcion.substring(0, 60))}${descripcion.length > 60 ? '...' : ''}</div>
                    <div class="product-actions">
                        <button class="btn-add" onclick="agregarAlCarrito(${id}, '${escapeHtml(nombre).replace(/'/g, "\\'")}', ${precio})">
                            🛒 Agregar
                        </button>
                        <button class="btn-view" onclick="verDetalleProducto(${id})">
                            👁️ Ver
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

// ====================================================
// DETALLE DE PRODUCTO
// ====================================================

function verDetalleProducto(id) {
    const producto = todosLosProductos.find(p => p.id === id);
    if (producto) {
        localStorage.setItem('productoSeleccionado', JSON.stringify(producto));
        window.location.href = 'producto-detalle.html';
    } else {
        mostrarToast('Producto no encontrado', 'error');
    }
}

// ====================================================
// PAGINACIÓN
// ====================================================

function actualizarPaginacion() {
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        pageInfo.textContent = `Página ${paginaActual + 1} de ${totalPaginas || 1}`;
    }
    
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (prevBtn) prevBtn.disabled = (paginaActual === 0);
    if (nextBtn) nextBtn.disabled = (paginaActual + 1 >= totalPaginas);
}

function cambiarPagina(delta) {
    const nuevaPagina = paginaActual + delta;
    if (nuevaPagina >= 0 && nuevaPagina < totalPaginas) {
        cargarTodosLosProductos(nuevaPagina);
    }
}

// ====================================================
// FILTRADO
// ====================================================

function aplicarFiltrosYMostrar() {
    const busqueda = document.getElementById('searchProduct')?.value.toLowerCase() || '';
    const categoria = document.getElementById('categoryFilter')?.value || '';
    const orden = document.getElementById('sortFilter')?.value || 'default';
    
    let filtrados = [...productosMock];
    
    // Filtro por búsqueda
    if (busqueda) {
        filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(busqueda));
    }
    
    // Filtro por categoría
    if (categoria) {
        filtrados = filtrados.filter(p => p.categoria === categoria);
    }
    
    // Ordenamiento
    if (orden === 'price-asc') {
        filtrados.sort((a, b) => a.precio - b.precio);
    } else if (orden === 'price-desc') {
        filtrados.sort((a, b) => b.precio - a.precio);
    } else if (orden === 'name') {
        filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
    
    totalPaginas = Math.ceil(filtrados.length / productosPorPagina);
    paginaActual = 0;
    const inicio = paginaActual * productosPorPagina;
    const paginados = filtrados.slice(inicio, inicio + productosPorPagina);
    
    const grid = document.getElementById('allProductsGrid');
    if (grid) mostrarProductosEnGrid(grid, paginados);
    actualizarPaginacion();
}

function filtrarPorCategoria(categoria) {
    const select = document.getElementById('categoryFilter');
    if (select) select.value = categoria;
    aplicarFiltrosYMostrar();
    navegarPagina('products');
}

// ====================================================
// EXPOSICIÓN DE FUNCIONES GLOBALES
// ====================================================

window.cargarProductosDestacados = cargarProductosDestacados;
window.cargarTodosLosProductos = () => cargarTodosLosProductos(0);
window.cambiarPagina = cambiarPagina;
window.aplicarFiltrosYMostrar = aplicarFiltrosYMostrar;
window.filtrarPorCategoria = filtrarPorCategoria;
window.verDetalleProducto = verDetalleProducto;