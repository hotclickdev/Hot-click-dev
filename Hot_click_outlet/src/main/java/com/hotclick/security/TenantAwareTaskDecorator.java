package com.hotclick.security;

import org.springframework.core.task.TaskDecorator;
import org.springframework.lang.NonNull;

/**
 * Propaga el TenantContext del thread padre a threads @Async.
 *
 * Sin esto, cualquier método anotado con @Async pierde el empresaId
 * porque el ThreadLocal no cruza automáticamente los límites de thread.
 *
 * Registro: AsyncConfig.taskExecutor() lo pasa a ThreadPoolTaskExecutor.
 *
 * Ejemplo de flujo:
 *   Request thread: TenantContext = 42L
 *   @Async method:  (sin decorator) TenantContext = null → bug silencioso
 *   @Async method:  (con decorator) TenantContext = 42L  → correcto
 */
public class TenantAwareTaskDecorator implements TaskDecorator {

    @Override
    @NonNull
    public Runnable decorate(@NonNull Runnable runnable) {
        Long empresaId = TenantContext.get();
        return () -> {
            try {
                if (empresaId != null) {
                    TenantContext.set(empresaId);
                }
                runnable.run();
            } finally {
                TenantContext.clear();
            }
        };
    }
}
