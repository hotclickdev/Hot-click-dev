package com.hotclick.agente.onboarding;

/**
 * Los 3 pasos de acompañamiento de un negocio que se registró (AG-40). Cada paso es un mensaje con un botón al
 * panel. Las rutas son del SPA del emprendedor.
 */
public enum OnboardingPaso {
    PERFIL("ONB_1", "/emprendedor/opciones/perfil", "Completar perfil",
        "¡Bienvenido a HotClick! Ya vimos tu registro. Paso 1 de 3: completa el perfil de tu negocio "
            + "(logo, descripción y contacto) para que tus clientes confíen en tu tienda."),
    PRIMER_PRODUCTO("ONB_2", "/emprendedor/productos/nuevo", "Subir producto",
        "Paso 2 de 3: sube tu primer producto con foto y precio en colones. Con uno solo ya puedes "
            + "empezar a vender."),
    CONECTAR_CANAL("ONB_3", "/emprendedor/bot", "Conectar canal",
        "Paso 3 de 3: conecta tu canal de WhatsApp para que el asistente atienda a tus clientes "
            + "mientras tú te dedicas a tu negocio.");

    private final String tipoAviso;
    private final String ruta;
    private final String tituloBoton;
    private final String texto;

    OnboardingPaso(String tipoAviso, String ruta, String tituloBoton, String texto) {
        this.tipoAviso = tipoAviso;
        this.ruta = ruta;
        this.tituloBoton = tituloBoton;
        this.texto = texto;
    }

    public String tipoAviso() { return tipoAviso; }
    public String ruta() { return ruta; }
    public String tituloBoton() { return tituloBoton; }
    public String texto() { return texto; }
}
