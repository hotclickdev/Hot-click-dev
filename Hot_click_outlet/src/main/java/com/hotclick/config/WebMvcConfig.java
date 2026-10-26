package com.hotclick.config;

import com.hotclick.security.LectorSoloLecturaInterceptor;
import com.hotclick.security.SlugTenantInterceptor;
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

    public WebMvcConfig(@NonNull SlugTenantInterceptor slugTenantInterceptor,
                        @NonNull LectorSoloLecturaInterceptor lectorSoloLecturaInterceptor,
                        @NonNull SuspensionImpagoInterceptor suspensionImpagoInterceptor) {
        this.slugTenantInterceptor = slugTenantInterceptor;
        this.lectorSoloLecturaInterceptor = lectorSoloLecturaInterceptor;
        this.suspensionImpagoInterceptor = suspensionImpagoInterceptor;
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
        // Suscripción impaga (día 9+): el negocio solo puede pagar. Billing y auth quedan abiertos;
        // las rutas de comprador ya rechazan tiendas no ACTIVO por su cuenta.
        registry.addInterceptor(suspensionImpagoInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/**", "/api/billing/**", "/api/public/**",
                                     // comprador: rutas exactas (ya rechazan tiendas no ACTIVO por su cuenta)
                                     "/api/tienda/*/pedidos",
                                     "/api/payments/guest-checkout", "/api/payments/guest/cancel/*",
                                     "/api/payments/tilopay/confirmar/*", "/api/payments/tilopay/reintentar/*",
                                     "/api/webhooks/**", "/api/sinpe/**", "/api/pos/qr/pago/**");
    }
}
