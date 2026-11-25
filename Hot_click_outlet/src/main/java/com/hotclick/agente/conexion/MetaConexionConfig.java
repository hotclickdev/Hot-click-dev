package com.hotclick.agente.conexion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Configuración de la app de Meta para conectar cuentas desde el panel. Todo viene de variables de entorno
 * (META_APP_ID, META_APP_SECRET, META_EMBEDDED_SIGNUP_CONFIG_ID, META_LOGIN_CONFIG_ID, META_GRAPH_VERSION).
 * El secreto de la app nunca sale de aquí hacia el navegador.
 */
@Component
public class MetaConexionConfig {

    private final String appId;
    private final String appSecret;
    private final String signupConfigId;
    private final String loginConfigId;
    private final String graphVersion;

    public MetaConexionConfig(@Value("${meta.app-id:}") String appId,
                              @Value("${meta.app-secret:}") String appSecret,
                              @Value("${meta.embedded-signup-config-id:}") String signupConfigId,
                              @Value("${meta.login-config-id:}") String loginConfigId,
                              @Value("${meta.graph-version:v23.0}") String graphVersion) {
        this.appId = limpio(appId);
        this.appSecret = limpio(appSecret);
        this.signupConfigId = limpio(signupConfigId);
        this.loginConfigId = limpio(loginConfigId);
        String v = limpio(graphVersion).toLowerCase(Locale.ROOT);
        this.graphVersion = v.matches("v\\d{1,2}\\.\\d") ? v : "v23.0";
    }

    private static String limpio(String s) {
        return s == null ? "" : s.strip();
    }

    public boolean whatsappDisponible() {
        return !appId.isEmpty() && !appSecret.isEmpty() && !signupConfigId.isEmpty();
    }

    public boolean metaLoginDisponible() {
        return !appId.isEmpty() && !appSecret.isEmpty() && !loginConfigId.isEmpty();
    }

    public void exigirWhatsapp() {
        if (!whatsappDisponible()) throw new ConexionNoConfiguradaException();
    }

    public void exigirLogin() {
        if (!metaLoginDisponible()) throw new ConexionNoConfiguradaException();
    }

    public String appId() { return appId; }
    public String signupConfigId() { return signupConfigId; }
    public String loginConfigId() { return loginConfigId; }
    public String graphVersion() { return graphVersion; }

    /** Solo para el cliente de Graph; no exponer ni registrar. */
    String appSecret() { return appSecret; }

    @Override
    public String toString() {
        return "MetaConexionConfig[whatsapp=" + whatsappDisponible() + ", login=" + metaLoginDisponible() + "]";
    }
}
