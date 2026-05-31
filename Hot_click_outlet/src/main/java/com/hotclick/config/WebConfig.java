package com.hotclick.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.concurrent.TimeUnit;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // CORS is handled exclusively by SecurityConfig.corsConfigurationSource().
    // Defining it here too created a wildcard origin bypass — removed.

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // Vite outputs content-hashed filenames under /assets/ — safe to cache for 1 year.
        // The hash changes on every deploy, so immutable is correct here.
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/")
                .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).immutable());
    }
}
