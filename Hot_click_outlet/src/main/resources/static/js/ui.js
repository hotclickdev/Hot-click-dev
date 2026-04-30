/**
 * HOTCLICK - Interfaz de Usuario
 * Manejo de eventos, navegación y modales
 * @version 1.0
 */

// ====================================================
// INICIALIZACIÓN DE EVENTOS
// ====================================================

/**
 * Configura todos los eventos de la interfaz
 * Se ejecuta al cargar la página
 */
function inicializarEventosUI() {
    console.log('🎨 Inicializando eventos de UI');
    
    // ====================================================
    // 1. NAVEGACIÓN PRINCIPAL
    // ====================================================
    
    // Desktop navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const page = link.getAttribute('data-page');
        if (page) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navegarPagina(page);
            });
        }
    });
    
    // Mobile navigation
    const mobileLinks = document.querySelectorAll('.mobile-link');
    mobileLinks.forEach(link => {
        const page = link.getAttribute('data-page');
        if (page) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navegarPagina(page);
                cerrarMenuMovil();
            });
        }
    });
    
    // ====================================================
    // 2. MENÚ MÓVIL
    // ====================================================
    
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
        });
    }
    
    function cerrarMenuMovil() {
        if (mobileMenu) mobileMenu.classList.remove('active');
    }
    
    // ====================================================
    // 3. BOTÓN DE EXPLORAR PRODUCTOS
    // ====================================================
    
    const exploreBtn = document.getElementById('exploreBtn');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            navegarPagina('products');
        });
    }
    
    // ====================================================
    // 4. CARRITO DE COMPRAS
    // ====================================================
    
    const cartBtn = document.getElementById('cartBtn');
    const closeCartModal = document.querySelector('#cartModal .modal-close');
    
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            actualizarModalCarrito();
            abrirModal('cartModal');
        });
    }
    
    if (closeCartModal) {
        closeCartModal.addEventListener('click', () => cerrarModal('cartModal'));
    }
    
    const checkoutBtn = document.getElementById('checkoutWhatsApp');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', enviarPedidoWhatsApp);
    }
    
    // Botón vaciar carrito
    const vaciarCartBtn = document.getElementById('vaciarCarrito');
    if (vaciarCartBtn) {
        vaciarCartBtn.addEventListener('click', vaciarCarrito);
    }
    
    // ====================================================
    // 5. AUTENTICACIÓN (LOGIN / REGISTER)
    // ====================================================
    
    const userBtn = document.getElementById('userBtn');
    const mobileUserBtn = document.getElementById('mobileUserBtn');
    
    if (userBtn) {
        userBtn.addEventListener('click', () => {
            const token = getToken();
            if (token) {
                cerrarSesion();
            } else {
                abrirModal('loginModal');
            }
        });
    }
    
    if (mobileUserBtn) {
        mobileUserBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const token = getToken();
            if (token) {
                cerrarSesion();
            } else {
                abrirModal('loginModal');
            }
            cerrarMenuMovil();
        });
    }
    
    // Login Modal
    const closeLoginModal = document.querySelector('#loginModal .modal-close');
    const btnLogin = document.getElementById('btnLogin');
    const showRegister = document.getElementById('showRegister');
    
    if (closeLoginModal) {
        closeLoginModal.addEventListener('click', () => cerrarModal('loginModal'));
    }
    
    if (btnLogin) {
        btnLogin.addEventListener('click', iniciarSesion);
    }
    
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            cerrarModal('loginModal');
            abrirModal('registerModal');
        });
    }
    
    // Register Modal
    const closeRegisterModal = document.querySelector('#registerModal .modal-close');
    const btnRegister = document.getElementById('btnRegister');
    const showLogin = document.getElementById('showLogin');
    
    if (closeRegisterModal) {
        closeRegisterModal.addEventListener('click', () => cerrarModal('registerModal'));
    }
    
    if (btnRegister) {
        btnRegister.addEventListener('click', registrarUsuario);
    }
    
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            cerrarModal('registerModal');
            abrirModal('loginModal');
        });
    }
    
    // ====================================================
    // 6. FILTROS DE PRODUCTOS
    // ====================================================
    
    const searchInput = document.getElementById('searchProduct');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            aplicarFiltrosYMostrar();
        });
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            aplicarFiltrosYMostrar();
        });
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            aplicarFiltrosYMostrar();
        });
    }
    
    // ====================================================
    // 7. PAGINACIÓN
    // ====================================================
    
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    if (prevPage) {
        prevPage.addEventListener('click', () => cambiarPagina(-1));
    }
    
    if (nextPage) {
        nextPage.addEventListener('click', () => cambiarPagina(1));
    }
    
    // ====================================================
    // 8. FORMULARIO DE CONTACTO
    // ====================================================
    
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            mostrarToast('📨 Mensaje enviado. Te contactaremos pronto', 'success');
            contactForm.reset();
        });
    }
    
    // ====================================================
    // 9. CERRAR MODALES AL HACER CLIC FUERA
    // ====================================================
    
    window.addEventListener('click', (e) => {
        if (e.target.classList && e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
            if (typeof detenerScanner === 'function') {
                detenerScanner();
            }
        }
    });
}

// Exponer función de inicialización
window.inicializarEventosUI = inicializarEventosUI;