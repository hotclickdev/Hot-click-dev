MODULOS QUE HE IDO CREANDO 
----
CONTACTO FALLA ESTE ERROR 

XXXXXXX
LO LLEVA GPT Y CUAL ES EL ERROR                                                                           123125 ERRRO NULL POINTER
-----


COMPACTAR CONVERSACION 
-----

GUARDAR UN ARCHIVO MEMORIA.MD CON TODO LO CREADO 
----

MODOS 

PREGUNTAR SI CAMBIO

'''

CAMBIAR AUTOMATICO SI LE DOY PERMISO

'''''''

PLANIFICAR MODE 

------

EL QUE NO SE DEBE USAR 


-----


ULTIMO MENSAJE 
Failed to load resource: the server responded with a status of 403 ()Understand this er


DASHBOARD CON DATOS HARCODEADOS CODIGO QUEMADO 

SE NECESITA UTILIZAR LA BASE DE DATOS, BUSCA LA BASE DE DATOS, EL MODELO 
PRODUCTO, ANALIZA LOS CAMPOS, Y QUE DATOS PODEMOS MOSTRAR EN EL DASHBOARD, 

Aquí tienes los datos filtrados, excluyendo la sección de usuarios y sus nombres específicos del listado:

Cifras Generales

Usuarios (Total): 5 (+12%)

Ventas totales: $45,678 (+8%)

Productos: 1,284 (+5%)

Pedidos: 89 (-2%)

Distribución por Categorías

Electrónica: 514

Hogar: 334

Deportes: 231

Moda: 205

Detalle del Último Pedido

Producto: Laptop Gamer (Electrónica)

Fecha: 15 Dic 2024

Estado: PENDIENTE

Cantidad: 2 unidades

Total: $1,500.00


ESO ES UN EJEMPLO DE LO QUE SE VE, POR FAVOR PLANIFICA COMO SE DEBE HACER LA CONEXION A LA BASE DE DATOS, PARA QUE LE DASHBOARD PAGINA ADMIN-DASHBOARD SE COMUNIQUE CON UN SERVICIO QUE JALE LOS DATOS LOS CARGUE Y LOS MUESTRE POR FAVOR ESTO ES UN PLAN MODE 

ARCHIVO AZF.SQL contiene que tablas y STORED PROCEDURES TRIGGERS, VISTAS AUDITORIAS 

ANALIZA EL STACK QUE USO 
| Capa | Tecnología |
|------|------------|
| Backend | Spring Boot 3.4.4, Java 24 |
| Base de datos | PostgreSQL en Aiven Cloud |
| Seguridad | Spring Security + JWT (stateless) |
| Frontend | HTML + CSS + JavaScript vanilla (multi-página) |
| Contenedor | Docker / Docker Compose |
| Build | Maven local en `maven/bin/` → usar `.\maven\bin\mvn` |


## Estructura de archivos clave

```
Hot_click_outlet/
├── src/main/java/com/hotclick/
│   ├── config/
│   │   ├── DataSeeder.java          ← Siembra roles y admin al arrancar
│   │   ├── SecurityConfig.java      ← JWT + CORS + rutas públicas/privadas
│   │   └── WebConfig.java
│   ├── controller/
│   │   ├── AuthController.java      ← POST /api/auth/login, /register
│   │   ├── UsuarioController.java   ← GET/PUT /api/usuarios/{id}
│   │   ├── ProductoController.java  ← GET /api/productos/**
│   │   ├── PedidoController.java    ← GET/POST /api/pedidos/**
│   │   ├── CarritoController.java
│   │   └── PremioController.java    ← ruleta de premios
│   ├── model/
│   │   ├── Usuario.java             ← tabla hot_click_usuario_tb
│   │   ├── Rol.java                 ← tabla hot_click_rol_tb
│   │   ├── Producto.java
│   │   ├── Pedido.java              ← tiene fechaEntregaReal para garantía
│   │   ├── PedidoItem.java
│   │   ├── Carrito.java / CarritoItem.java
│   │   ├── Premio.java / GiroRuleta.java / ResultadoRuleta.java
│   │   └── Referido.java
│   ├── security/
│   │   ├── JwtUtil.java
│   │   └── JwtRequestFilter.java
│   └── utils/Constants.java         ← ROL_ADMIN_IT, ROL_ADMIN_CLIENTE, ROL_USUARIO_FINAL
│
├── src/main/resources/
│   ├── application.properties       ← ⚠️ ddl-auto=create (borra BD al reiniciar)
│   └── static/
│       ├── pages/
│       │   ├── index.html
│       │   ├── productos.html
│       │   ├── categorias.html
│       │   ├── carrito.html
│       │   ├── perfil.html          ← 3 tabs: Mis Datos / Mis Compras / Cambiar Datos
│       │   ├── producto-detalle.html
│       │   ├── contacto.html
│       │   ├── nosotros.html
│       │   ├── login.html
│       │   ├── registro.html
│       │   └── escaner.html         ← página legacy, ya no se usa activamente
│       ├── admin/
│       │   ├── admin-dashboard.html
│       │   ├── admin-productos.html
│       │   ├── admin-bodegas.html
│       │   └── admin-categorias.html
│       ├── js/
│       │   ├── utils.js             ← mostrarToast, abrirModal, cerrarModal
│       │   ├── api.js               ← apiLogin, apiRegister, apiLogout, getToken, API_URL
│       │   ├── auth.js              ← iniciarSesion, registrarUsuario, cerrarSesion, actualizarIconoSesion
│       │   └── cart.js              ← lógica del carrito
│       └── css/style.css
```

---

NECESITO HACER UNA VISTA PARA PRODUCTOS,USUARIOS( )