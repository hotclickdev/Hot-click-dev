package com.hotclick.config;

import com.hotclick.security.SlugTenantInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final @NonNull HandlerInterceptor slugTenantInterceptor;

    public WebMvcConfig(@NonNull SlugTenantInterceptor slugTenantInterceptor) {
        this.slugTenantInterceptor = slugTenantInterceptor;
    }

    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        registry.addInterceptor(slugTenantInterceptor)
                .addPathPatterns("/api/tienda/**");
    }
}
