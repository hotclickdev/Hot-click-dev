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
        // LECTOR: solo lectura en productos, pedidos y wallet (escrituras -> 403).
        registry.addInterceptor(lectorSoloLecturaInterceptor)
                .addPathPatterns("/api/productos", "/api/productos/**", "/api/pedidos", "/api/pedidos/**",
                                 "/api/wallet/**");
    }
}
