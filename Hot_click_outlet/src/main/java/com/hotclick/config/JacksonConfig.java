package com.hotclick.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.hibernate.proxy.HibernateProxy;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Varios controllers devuelven entidades JPA directamente (no DTOs) en la respuesta.
 * Con spring.jpa.open-in-view=false, cualquier asociación @ManyToOne LAZY que no se
 * inicialice explícitamente dentro de la transacción llega a Jackson como un proxy
 * ByteBuddy de Hibernate. Sin este mixin, Jackson intenta serializar las propiedades
 * sintéticas del proxy ("hibernateLazyInitializer", "handler") y falla con
 * InvalidDefinitionException incluso para proxies ya inicializados.
 */
@Configuration
public class JacksonConfig {

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private interface HibernateProxyMixin {}

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer hibernateProxyMixinCustomizer() {
        return builder -> builder.mixIn(HibernateProxy.class, HibernateProxyMixin.class);
    }
}
