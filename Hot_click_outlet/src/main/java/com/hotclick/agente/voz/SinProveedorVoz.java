package com.hotclick.agente.voz;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;

/** Se cumple cuando {@code agente.voz.proveedor} está vacía o no existe. */
public class SinProveedorVoz implements Condition {
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        String p = context.getEnvironment().getProperty("agente.voz.proveedor", "");
        return p.isBlank();
    }
}
