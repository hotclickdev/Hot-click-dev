package com.hotclick.config;

import com.hotclick.security.LectorSoloLecturaInterceptor;
import com.hotclick.security.SlugTenantInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final @NonNull HandlerInterceptor slugTenantInterceptor;
    private final @NonNull HandlerInterceptor lectorSoloLecturaInterceptor;

    public WebMvcConfig(@NonNull SlugTenantInterceptor slugTenantInterceptor,
                        @NonNull LectorSoloLecturaInterceptor lectorSoloLecturaInterceptor) {
        this.slugTenantInterceptor = slugTenantInterceptor;
        this.lectorSoloLecturaInterceptor = lectorSoloLecturaInterceptor;
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
    }
}
