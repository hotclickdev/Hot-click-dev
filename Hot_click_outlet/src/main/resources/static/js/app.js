/**
 * HOTCLICK - Aplicación Principal
 * Orquestador que inicializa todos los módulos
 * @version 1.0
 */

// ====================================================
// VARIABLES GLOBALES
// ====================================================

let currentPage = 'home';

// ====================================================
// INICIALIZACIÓN
// ====================================================

/**
 * Se ejecuta cuando el DOM está completamente cargado
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔥 HOTCLICK - Aplicación iniciada');
    console.log('📡 Backend URL:', API_URL);
    
    // 1. Verificar conexión con el backend
    verificarBackend();
    
    // 2. Cargar productos destacados (home)
    if (typeof cargarProductosDestacados === 'function') {
        cargarProductosDestacados();
    }
    
    // 3. Cargar catálogo completo
    if (typeof cargarTodosLosProductos === 'function') {
        cargarTodosLosProductos(0);
    }
    
    // 4. Generar categorías (si existe el grid)
    if (document.getElementById('categoriesGrid')) {
        generarCategorias();
    }
    
    // 5. Inicializar eventos de UI
    if (typeof inicializarEventosUI === 'function') {
        inicializarEventosUI();
    }
    
    // 6. Inicializar carrito
    if (typeof inicializarCarrito === 'function') {
        inicializarCarrito();
    }
    
    // 7. Verificar sesión de usuario
    if (typeof verificarSesion === 'function') {
        verificarSesion();
    }
    
    // 8. Inicializar eventos del escáner
    if (typeof inicializarEventosScanner === 'function') {
        inicializarEventosScanner();
    }
    
    // 9. Cargar datos del admin si estamos en panel de administración
    if (document.querySelector('.admin-dashboard')) {
        if (typeof verificarAccesoAdmin === 'function') {
            verificarAccesoAdmin();
        }
        if (typeof cargarEstadisticasAdmin === 'function') {
            cargarEstadisticasAdmin();
        }
        if (typeof cargarUsuariosAdmin === 'function') {
            cargarUsuariosAdmin();
        }
        if (typeof cargarProductosAdmin === 'function') {
            cargarProductosAdmin();
        }
        if (typeof cargarBodegasAdmin === 'function') {
            cargarBodegasAdmin();
        }
        if (typeof cargarCategoriasAdmin === 'function') {
            cargarCategoriasAdmin();
        }
        if (typeof cargarReportesFinancieros === 'function') {
            cargarReportesFinancieros();
        }
    }
    
    // 10. Mostrar página de inicio
    if (typeof navegarPagina === 'function') {
        navegarPagina('home');
    }
    
    console.log('✅ HOTCLICK - Aplicación lista');
});

// ====================================================
// NAVEGACIÓN ENTRE PÁGINAS
// ====================================================

/**
 * Cambia entre las diferentes secciones de la página
 * @param {string} page - Nombre de la página ('home', 'products', 'categories', 'about', 'contact')
 */
function navegarPagina(page) {
    currentPage = page;
    console.log(`📄 Navegando a: ${page}`);
    
    // Ocultar TODAS las secciones
    const heroSection = document.getElementById('heroSection');
    const homeSection = document.getElementById('homeSection');
    const productsSection = document.getElementById('productsSection');
    const categoriesSection = document.getElementById('categoriesSection');
    const aboutSection = document.getElementById('aboutSection');
    const contactSection = document.getElementById('contactSection');
    
    // Ocultar todas
    if (heroSection) heroSection.style.display = 'none';
    if (homeSection) homeSection.style.display = 'none';
    if (productsSection) productsSection.style.display = 'none';
    if (categoriesSection) categoriesSection.style.display = 'none';
    if (aboutSection) aboutSection.style.display = 'none';
    if (contactSection) contactSection.style.display = 'none';
    
    // Mostrar la sección seleccionada
    if (page === 'home') {
        if (heroSection) heroSection.style.display = 'block';
        if (homeSection) homeSection.style.display = 'block';
        // Actualizar productos destacados
        if (typeof cargarProductosDestacados === 'function') {
            cargarProductosDestacados();
        }
    } 
    else if (page === 'products') {
        if (productsSection) {
            productsSection.style.display = 'block';
            console.log('✅ Mostrando sección de productos');
            if (typeof cargarTodosLosProductos === 'function') {
                cargarTodosLosProductos(0);
            }
        } else {
            console.error('❌ No se encontró el elemento productsSection');
        }
    } 
    else if (page === 'categories') {
        if (categoriesSection) categoriesSection.style.display = 'block';
    } 
    else if (page === 'about') {
        if (aboutSection) aboutSection.style.display = 'block';
    } 
    else if (page === 'contact') {
        if (contactSection) contactSection.style.display = 'block';
    }
    
    // Actualizar clase activa en navegación (desktop)
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Scroll suave al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ====================================================
// GENERAR CATEGORÍAS DINÁMICAMENTE
// ====================================================

/**
 * Genera el grid de categorías
 */
function generarCategorias() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    
    const categorias = [
        { nombre: 'Electrónica', icono: '💻', cat: 'electronica', descripcion: 'Laptops, celulares, tablets y más' },
        { nombre: 'Hogar', icono: '🏠', cat: 'hogar', descripcion: 'Muebles, decoración, electrodomésticos' },
        { nombre: 'Deportes', icono: '⚽', cat: 'deportes', descripcion: 'Equipo deportivo, ropa, accesorios' },
        { nombre: 'Moda', icono: '👕', cat: 'moda', descripcion: 'Ropa, calzado, accesorios' },
        { nombre: 'Juguetes', icono: '🎮', cat: 'juguetes', descripcion: 'Juguetes para todas las edades' },
        { nombre: 'Libros', icono: '📚', cat: 'libros', descripcion: 'Libros, revistas, material educativo' }
    ];
    
    grid.innerHTML = categorias.map(cat => `
        <div class="category-card" data-cat="${cat.cat}">
            <div class="category-icon">${cat.icono}</div>
            <h3>${cat.nombre}</h3>
            <p class="category-desc">${cat.descripcion}</p>
        </div>
    `).join('');
    
    // Agregar evento de click a las categorías
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const categoria = card.getAttribute('data-cat');
            if (categoria) {
                if (typeof filtrarPorCategoria === 'function') {
                    filtrarPorCategoria(categoria);
                }
            }
        });
    });
}

// ====================================================
// EXPOSICIÓN DE FUNCIONES GLOBALES
// ====================================================

// Funciones de navegación
window.navegarPagina = navegarPagina;
window.generarCategorias = generarCategorias;

// Funciones de autenticación (de auth.js)
window.iniciarSesion = iniciarSesion;
window.registrarUsuario = registrarUsuario;
window.cerrarSesion = cerrarSesion;
window.actualizarIconoSesion = actualizarIconoSesion;
window.verificarSesion = verificarSesion;

// Funciones de productos (de products.js)
window.cargarProductosDestacados = cargarProductosDestacados;
window.cargarTodosLosProductos = cargarTodosLosProductos;
window.cambiarPagina = cambiarPagina;
window.aplicarFiltrosYMostrar = aplicarFiltrosYMostrar;
window.filtrarPorCategoria = filtrarPorCategoria;
window.verDetalleProducto = verDetalleProducto;

// Funciones de carrito (de cart.js)
window.agregarAlCarrito = agregarAlCarrito;
window.eliminarDelCarrito = eliminarDelCarrito;
window.actualizarCantidad = actualizarCantidad;
window.actualizarModalCarrito = actualizarModalCarrito;
window.enviarPedidoWhatsApp = enviarPedidoWhatsApp;
window.vaciarCarrito = vaciarCarrito;

// Funciones de escáner (de scanner.js)
window.iniciarScanner = iniciarScanner;
window.detenerScanner = detenerScanner;
window.buscarProductoPorCodigo = buscarProductoPorCodigo;

// Funciones de admin (de admin.js)
window.verificarAccesoAdmin = verificarAccesoAdmin;
window.cargarEstadisticasAdmin = cargarEstadisticasAdmin;
window.cargarUsuariosAdmin = cargarUsuariosAdmin;
window.cargarProductosAdmin = cargarProductosAdmin;
window.cargarBodegasAdmin = cargarBodegasAdmin;
window.cargarCategoriasAdmin = cargarCategoriasAdmin;
window.cargarReportesFinancieros = cargarReportesFinancieros;
window.editarUsuario = editarUsuario;
window.eliminarUsuario = eliminarUsuario;
window.editarProducto = editarProducto;
window.eliminarProducto = eliminarProducto;
window.editarBodega = editarBodega;
window.eliminarBodega = eliminarBodega;
window.editarCategoria = editarCategoria;
window.eliminarCategoria = eliminarCategoria;