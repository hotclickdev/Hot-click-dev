package com.hotclick.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.lang.NonNull;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private static final Duration HTTP_CONNECT_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration HTTP_READ_TIMEOUT = Duration.ofSeconds(30);

    /** RestTemplate compartido para llamadas HTTP externas (Hacienda, PostHog, etc.). */
    @Bean
    public RestTemplate restTemplate() {
        // ALTO-02: HttpURLConnection (SimpleClientHttpRequestFactory) no soporta PATCH, que ONVO exige
        // para actualizar items de suscripción. El HttpClient del JDK soporta todos los métodos.
        java.net.http.HttpClient http = java.net.http.HttpClient.newBuilder()
            .connectTimeout(HTTP_CONNECT_TIMEOUT)
            .version(java.net.http.HttpClient.Version.HTTP_1_1)
            .followRedirects(java.net.http.HttpClient.Redirect.NEVER)
            .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(HTTP_READ_TIMEOUT);
        return new RestTemplate(factory);
    }

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
