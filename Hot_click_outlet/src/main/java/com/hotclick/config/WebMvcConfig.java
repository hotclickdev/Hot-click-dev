package com.hotclick.config;

import com.hotclick.security.CajeroSinCatalogoInterceptor;
import com.hotclick.security.CajeroSoloPosInterceptor;
import com.hotclick.security.LectorSoloLecturaInterceptor;
import com.hotclick.security.SlugTenantInterceptor;
import com.hotclick.security.SoloPropietarioNegocioInterceptor;
import com.hotclick.security.SuspensionImpagoInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final @NonNull HandlerInterceptor slugTenantInterceptor;
    private final @NonNull HandlerInterceptor lectorSoloLecturaInterceptor;
    private final @NonNull HandlerInterceptor suspensionImpagoInterceptor;
    private final @NonNull HandlerInterceptor soloPropietarioNegocioInterceptor;
    private final @NonNull HandlerInterceptor cajeroSinCatalogoInterceptor;
    private final @NonNull HandlerInterceptor cajeroSoloPosInterceptor;

    public WebMvcConfig(@NonNull SlugTenantInterceptor slugTenantInterceptor,
                        @NonNull LectorSoloLecturaInterceptor lectorSoloLecturaInterceptor,
                        @NonNull SuspensionImpagoInterceptor suspensionImpagoInterceptor,
                        @NonNull SoloPropietarioNegocioInterceptor soloPropietarioNegocioInterceptor,
                        @NonNull CajeroSinCatalogoInterceptor cajeroSinCatalogoInterceptor,
                        @NonNull CajeroSoloPosInterceptor cajeroSoloPosInterceptor) {
        this.slugTenantInterceptor = slugTenantInterceptor;
        this.lectorSoloLecturaInterceptor = lectorSoloLecturaInterceptor;
        this.suspensionImpagoInterceptor = suspensionImpagoInterceptor;
        this.soloPropietarioNegocioInterceptor = soloPropietarioNegocioInterceptor;
        this.cajeroSinCatalogoInterceptor = cajeroSinCatalogoInterceptor;
        this.cajeroSoloPosInterceptor = cajeroSoloPosInterceptor;
    }

    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        registry.addInterceptor(slugTenantInterceptor)
                .addPathPatterns("/api/tienda/**");
        // LECTOR: deny por defecto en escrituras de /api/** (opt-in con @PermiteLector). Se excluyen
        // áreas sin negocio: auth, públicas, storefront, webhooks y checkout de comprador.
        registry.addInterceptor(lectorSoloLecturaInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/**", "/api/public/**", "/api/tienda/**", "/api/webhooks/**",
                                     "/api/payments/**", "/api/sinpe/**",
                                     // pago público POS-QR del comprador (no es escritura del negocio actual)
                                     "/api/pos/qr/pago/**");
        // CAJERO de equipo: deny por defecto fuera del POS (allowlist en el interceptor). Mismas exclusiones
        // sin negocio que el LECTOR.
        registry.addInterceptor(cajeroSoloPosInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/**", "/api/public/**", "/api/tienda/**", "/api/webhooks/**",
                                     "/api/payments/**", "/api/sinpe/**", "/api/pos/qr/pago/**");
        // CAJERO de equipo (rol Spring EMPRENDEDOR): ninguna escritura de catálogo, stock, categorías, inventario ni bodegas.
        registry.addInterceptor(cajeroSinCatalogoInterceptor)
                .addPathPatterns("/api/productos", "/api/productos/**", "/api/stock/**", "/api/categorias",
                                 "/api/categorias/**", "/api/inventario/**", "/api/admin/inventario/**",
                                 "/api/bodegas", "/api/bodegas/**");
        // Área 2: pantallas de gestión del negocio (finanzas, métricas, ads, clientes, mesas, importación, borrado
        // de datos) solo para el PROPIETARIO o el ADMIN; EDITOR y LECTOR (rol Spring EMPRENDEDOR) reciben 403.
        registry.addInterceptor(soloPropietarioNegocioInterceptor)
                .addPathPatterns("/api/admin/finanzas/**", "/api/admin/dashboard", "/api/admin/ads/**",
                                 "/api/admin/asignar/**", "/api/admin/mesas", "/api/admin/mesas/**",
                                 "/api/admin/importar/**", "/api/admin/reset-datos",
                                 "/api/admin/reset-confirmacion", "/api/admin/reset-codigo",
                                 // gift cards (crear/cancelar/listar códigos con saldo) y ficha con IA (costo)
                                 "/api/admin/gift-cards", "/api/admin/gift-cards/**",
                                 "/api/admin/productos/generar-ia",
                                 // MED-1..4 re-auditoría área 2: KPIs financieros, IA (cuota del negocio), pronóstico,
                                 // inventario valorizado y sucursales (crear/renombrar/desactivar)
                                 "/api/admin/executive", "/api/admin/executive/**",
                                 "/api/admin/ai", "/api/admin/ai/**",
                                 "/api/admin/forecast", "/api/admin/forecast/**",
                                 "/api/admin/inventario", "/api/admin/inventario/**",
                                 "/api/sucursales", "/api/sucursales/**",
                                 // revisión de confirmaciones SINPE manuales del POS (lista del dueño; el POS no la usa)
                                 "/api/admin/pos/sinpe-confirmaciones", "/api/admin/pos/sinpe-confirmaciones/**");
        // Suscripción impaga (día 9+): el negocio solo ve cuenta/monto y paga (allowlist exacta en el interceptor);
        // las rutas de comprador ya rechazan tiendas no ACTIVO por su cuenta.
        registry.addInterceptor(suspensionImpagoInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/public/**",
                                     // comprador: rutas exactas (ya rechazan tiendas no ACTIVO por su cuenta)
                                     "/api/tienda/*/pedidos",
                                     "/api/payments/guest-checkout", "/api/payments/guest/cancel/*",
                                     "/api/payments/tilopay/confirmar/*", "/api/payments/tilopay/reintentar/*",
                                     "/api/sinpe/checkout", "/api/sinpe/guest-checkout",
                                     "/api/sinpe/comprobantes/*/url-firmada",
                                     "/api/webhooks/**", "/api/pos/qr/pago/**");
    }
}
