package com.hotclick.agente.motor;

import com.hotclick.agente.webhook.MensajeEntrante;

import java.util.UUID;

/**
 * Contexto confiable de una ejecución: lo fija el canal (quién escribe y a qué negocio), nunca el modelo.
 * Las herramientas toman empresa y teléfono SOLO de aquí, jamás de los argumentos que genera Claude.
 *
 * @param empresaId       negocio al que pertenece la conversación; null solo en perfiles de marketplace
 * @param contactoExterno identificador del cliente en el canal (teléfono, PSID…); es PII: no loguear
 * @param perfil          perfil con el que corre el motor
 * @param nombreNegocio   nombre comercial para el prompt; opcional
 * @param canal           canal por el que escribe el cliente; null si no aplica (p. ej. web)
 * @param sesionId        conversación del bot; null si no hay
 * @param usuarioId       usuario autenticado de la web pública (lo fija el controlador desde la sesión, nunca el
 *                        modelo); null si el visitante es anónimo o el canal no es la web
 */
public record ContextoHerramienta(Long empresaId, String contactoExterno, PerfilAgente perfil, String nombreNegocio,
                                  MensajeEntrante.Canal canal, UUID sesionId, Long usuarioId) {

    public ContextoHerramienta {
        if (perfil == null) {
            throw new IllegalArgumentException("El perfil es obligatorio");
        }
        if (perfil.alcance() == Alcance.EMPRESA && empresaId == null) {
            throw new IllegalArgumentException("El perfil " + perfil + " exige empresaId");
        }
    }

    public ContextoHerramienta(Long empresaId, String contactoExterno, PerfilAgente perfil, String nombreNegocio,
                               MensajeEntrante.Canal canal, UUID sesionId) {
        this(empresaId, contactoExterno, perfil, nombreNegocio, canal, sesionId, null);
    }

    public ContextoHerramienta(Long empresaId, String contactoExterno, PerfilAgente perfil, String nombreNegocio) {
        this(empresaId, contactoExterno, perfil, nombreNegocio, null, null, null);
    }

    public ContextoHerramienta(Long empresaId, String contactoExterno, PerfilAgente perfil) {
        this(empresaId, contactoExterno, perfil, null, null, null, null);
    }

    /** true si la búsqueda debe cubrir todo el marketplace en vez de una sola empresa. */
    public boolean esMarketplace() {
        return switch (perfil.alcance()) {
            case MARKETPLACE -> true;
            case EMPRESA -> false;
            case EMPRESA_O_MARKETPLACE -> empresaId == null;
        };
    }

    /** Sin contacto en logs (Ley 8968). */
    @Override
    public String toString() {
        return "ContextoHerramienta[empresa=" + empresaId + ", perfil=" + perfil + ", canal=" + canal + "]";
    }
}
