package com.hotclick.agente.motor;

/** Qué parte del catálogo y de los datos puede ver un perfil. */
public enum Alcance {
    /** Solo los datos de una empresa (la del {@link ContextoHerramienta}); exige empresaId. */
    EMPRESA,
    /** Todo el marketplace, aplicando la regla de visibilidad del catálogo público; ignora empresaId. */
    MARKETPLACE,
    /** Una empresa si el contexto trae empresaId; marketplace si no (asesor de la web pública). */
    EMPRESA_O_MARKETPLACE
}
