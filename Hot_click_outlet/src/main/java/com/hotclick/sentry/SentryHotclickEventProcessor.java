package com.hotclick.sentry;

import com.hotclick.security.TenantContext;
import io.sentry.EventProcessor;
import io.sentry.Hint;
import io.sentry.SentryEvent;
import io.sentry.protocol.User;
import org.springframework.stereotype.Component;

/**
 * Tags de tenant/usuario en cada evento. Nunca PII (correo, tokens).
 */
@Component
public class SentryHotclickEventProcessor implements EventProcessor {

    @Override
    public SentryEvent process(SentryEvent event, Hint hint) {
        Long empresaId = TenantContext.get();
        if (empresaId != null) {
            event.setTag("empresa_id", String.valueOf(empresaId));
        }

        Long userId = SentryRequestContext.userId();
        if (userId != null) {
            User user = new User();
            user.setId(String.valueOf(userId));
            event.setUser(user);
            event.setTag("user_id", String.valueOf(userId));
        }

        String rol = SentryRequestContext.rol();
        if (rol != null) {
            event.setTag("rol", rol);
        }
        return event;
    }
}
