/**
 * HOTCLICK - Escáner de Productos
 * Simulación de escáner de código de barras / QR
 * @version 1.0
 */

// ====================================================
// VARIABLES GLOBALES
// ====================================================

let streamActivo = null;
let scanInterval = null;

// ====================================================
// INICIAR ESCÁNER
// ====================================================

/**
 * Inicia el escáner (simulado o real si hay cámara)
 */
async function iniciarScanner() {
    abrirModal('scanModal');
    
    // Intentar usar cámara real (si está disponible)
    const video = document.getElementById('scannerVideo');
    const scanResultDiv = document.getElementById('scanResult');
    const scannedProductDiv = document.getElementById('scannedProduct');
    
    if (video && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamActivo = stream;
            video.srcObject = stream;
            video.style.display = 'block';
            video.play();
            
            // Simular escaneo después de 3 segundos (para demo)
            scanInterval = setTimeout(() => {
                simularEscaneo();
            }, 3000);
        } catch (error) {
            console.error('Error accediendo a la cámara:', error);
            simularEscaneo();
        }
    } else {
        // Si no hay cámara, simular escaneo
        simularEscaneo();
    }
}

/**
 * Simula el escaneo de un producto
 */
function simularEscaneo() {
    const scanResultDiv = document.getElementById('scanResult');
    const scannedProductDiv = document.getElementById('scannedProduct');
    const addToCartBtn = document.getElementById('addScannedToCart');
    
    if (scanResultDiv && scannedProductDiv) {
        scanResultDiv.classList.remove('hidden');
        
        // Producto escaneado simulado
        const productoEscaneado = {
            id: Math.floor(Math.random() * 1000) + 100,
            nombre: 'Producto Escaneado',
            precio: (Math.random() * 100 + 10).toFixed(2)
        };
        
        scannedProductDiv.innerHTML = `
            <div class="scanned-product">
                <div class="scanned-icon">📷</div>
                <div class="scanned-info">
                    <strong>${productoEscaneado.nombre}</strong>
                    <span>$${productoEscaneado.precio}</span>
                </div>
                <div class="scanned-code">Código: HC-${productoEscaneado.id}</div>
            </div>
        `;
        
        if (addToCartBtn) {
            addToCartBtn.onclick = () => {
                agregarAlCarrito(productoEscaneado.id, productoEscaneado.nombre, parseFloat(productoEscaneado.precio));
                cerrarModal('scanModal');
                mostrarToast('Producto escaneado agregado al carrito', 'success');
                detenerScanner();
            };
        }
    }
}

/**
 * Detiene el escáner y libera la cámara
 */
function detenerScanner() {
    if (streamActivo) {
        streamActivo.getTracks().forEach(track => track.stop());
        streamActivo = null;
    }
    if (scanInterval) {
        clearTimeout(scanInterval);
        scanInterval = null;
    }
    const video = document.getElementById('scannerVideo');
    if (video) {
        video.srcObject = null;
        video.style.display = 'none';
    }
}

// ====================================================
// BUSCAR PRODUCTO POR CÓDIGO
// ====================================================

/**
 * Busca un producto por su código de barras
 * @param {string} codigo - Código de barras a buscar
 */
async function buscarProductoPorCodigo(codigo) {
    if (!codigo || codigo.trim() === '') {
        mostrarToast('Ingresa un código de barras', 'error');
        return;
    }
    
    mostrarToast('Buscando producto...', 'info');
    
    try {
        // Buscar en productos existentes (mock por ahora)
        const productoEncontrado = productosMock.find(p => p.codigoBarras === codigo);
        
        if (productoEncontrado) {
            mostrarToast(`Producto encontrado: ${productoEncontrado.nombre}`, 'success');
            return productoEncontrado;
        } else {
            mostrarToast('Producto no encontrado en el catálogo', 'error');
            return null;
        }
    } catch (error) {
        console.error('Error buscando producto:', error);
        mostrarToast('Error al buscar producto', 'error');
        return null;
    }
}

// ====================================================
// INICIALIZAR EVENTOS DEL ESCÁNER
// ====================================================

function inicializarEventosScanner() {
    const scanBtn = document.getElementById('scanBtn');
    const closeScanModal = document.querySelector('#scanModal .modal-close');
    const searchCodeBtn = document.getElementById('searchCodeBtn');
    const codeInput = document.getElementById('codeInput');
    
    if (scanBtn) {
        scanBtn.addEventListener('click', iniciarScanner);
    }
    
    if (closeScanModal) {
        closeScanModal.addEventListener('click', () => {
            cerrarModal('scanModal');
            detenerScanner();
        });
    }
    
    if (searchCodeBtn && codeInput) {
        searchCodeBtn.addEventListener('click', async () => {
            const codigo = codeInput.value.trim();
            const producto = await buscarProductoPorCodigo(codigo);
            if (producto) {
                agregarAlCarrito(producto.id, producto.nombre, producto.precio);
                codeInput.value = '';
            }
        });
        
        codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchCodeBtn.click();
            }
        });
    }
}

// Exponer funciones globales
window.iniciarScanner = iniciarScanner;
window.detenerScanner = detenerScanner;
window.buscarProductoPorCodigo = buscarProductoPorCodigo;