package com.hotclick.agente.motor;

/**
 * Contexto confiable de una ejecución: lo fija el canal (quién escribe y a qué negocio), nunca el modelo.
 * Las herramientas toman empresa y teléfono SOLO de aquí, jamás de los argumentos que genera Claude.
 *
 * @param empresaId       negocio al que pertenece la conversación; null solo en perfiles de marketplace
 * @param contactoExterno identificador del cliente en el canal (teléfono, PSID…); es PII: no loguear
 * @param perfil          perfil con el que corre el motor
 * @param nombreNegocio   nombre comercial para el prompt; opcional
 */
public record ContextoHerramienta(Long empresaId, String contactoExterno, PerfilAgente perfil, String nombreNegocio) {

    public ContextoHerramienta {
        if (perfil == null) {
            throw new IllegalArgumentException("El perfil es obligatorio");
        }
        if (perfil.alcance() == Alcance.EMPRESA && empresaId == null) {
            throw new IllegalArgumentException("El perfil " + perfil + " exige empresaId");
        }
    }

    public ContextoHerramienta(Long empresaId, String contactoExterno, PerfilAgente perfil) {
        this(empresaId, contactoExterno, perfil, null);
    }

    /** true si la búsqueda debe cubrir todo el marketplace en vez de una sola empresa. */
    public boolean esMarketplace() {
        return switch (perfil.alcance()) {
            case MARKETPLACE -> true;
            case EMPRESA -> false;
            case EMPRESA_O_MARKETPLACE -> empresaId == null;
        };
    }
}
