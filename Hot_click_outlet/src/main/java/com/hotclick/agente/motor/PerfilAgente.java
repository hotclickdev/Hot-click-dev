package com.hotclick.agente.motor;

import java.util.Set;

/**
 * Perfiles del motor: cada uno fija su prompt base, su alcance y la lista cerrada de herramientas que puede
 * ver y ejecutar. El modelo de cada perfil se configura en {@link ConfigMotorAgente} (propiedades
 * {@code agente.modelo.*}).
 */
public enum PerfilAgente {

    /** Clientes de un negocio: catálogo de su tienda, sus pedidos (mismo teléfono), conocimiento de la tienda. */
    NEGOCIO_VENTAS(Alcance.EMPRESA, Set.of(
        "buscar_productos", "crear_enlace_compra", "consultar_pedido", "consultar_conocimiento", "pasar_a_persona")),

    /** Dueño y personal: herramientas de consulta del copilot (sin mutaciones ni finanzas por este canal). */
    NEGOCIO_INTERNO(Alcance.EMPRESA, Set.of(
        "buscar_productos", "pasar_a_persona",
        "consultar_inventario", "consultar_ventas", "recomendaciones", "reporte_negocio",
        "comparar_catalogo_publico", "proyeccion_negocio", "perfil_marca", "consultar_clientes")),

    /** Cuenta de HotClick: todo el marketplace, planes y captación de negocios. */
    HOTCLICK(Alcance.MARKETPLACE, Set.of(
        "buscar_productos", "explicar_planes", "registrar_lead", "consultar_conocimiento", "pasar_a_persona")),

    /** Asesor de la web pública (ficha de producto / tienda). */
    ASESOR_WEB(Alcance.EMPRESA_O_MARKETPLACE, Set.of(
        "buscar_productos", "consultar_conocimiento", "pasar_a_persona"));

    private final Alcance alcance;
    private final Set<String> herramientas;

    PerfilAgente(Alcance alcance, Set<String> herramientas) {
        this.alcance = alcance;
        this.herramientas = herramientas;
    }

    public Alcance alcance() { return alcance; }

    /** Nombres de herramientas que este perfil puede ver y ejecutar (lista cerrada). */
    public Set<String> herramientas() { return herramientas; }

    public boolean permite(String nombreHerramienta) {
        return herramientas.contains(nombreHerramienta);
    }

    /** System prompt base del perfil con el tono y el nombre del negocio. Estable entre turnos (cacheable). */
    public String promptSistema(TonoAgente tono, String nombreNegocio) {
        return PromptsAgente.construir(this, tono == null ? TonoAgente.POR_DEFECTO : tono, nombreNegocio);
    }
}
