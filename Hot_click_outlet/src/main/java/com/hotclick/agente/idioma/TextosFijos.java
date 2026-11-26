package com.hotclick.agente.idioma;

/**
 * AG-39: textos fijos del bot (traspaso, moderación, STOP/ACTIVAR, comprobante) por idioma. Mapa simple en código:
 * el backend no tiene i18n de mensajes de canal. Español es el valor por defecto y un idioma nulo cae en él.
 */
public final class TextosFijos {

    private TextosFijos() { }

    private static Idioma o(Idioma i) { return i == null ? Idioma.ES : i; }

    public static String traspaso(Idioma idioma, boolean usted) {
        return switch (o(idioma)) {
            case EN -> "Thanks for writing to us. A member of our team will continue with you shortly.";
            case PT -> "Obrigado por nos escrever. Uma pessoa da equipe vai continuar com voce em breve.";
            case ES -> usted
                ? "Gracias por escribirnos. Para ayudarle mejor, le paso con una persona del equipo, que le responderá en breve."
                : "Gracias por escribirnos. Para ayudarte mejor, te paso con una persona del equipo, que te responderá en breve.";
        };
    }

    public static String moderacion(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "I can only help with questions about the business and its products.";
            case PT -> "So posso ajudar com perguntas sobre o negocio e seus produtos.";
            case ES -> "Solo puedo ayudar con consultas sobre el negocio y sus productos.";
        };
    }

    public static String baja(Idioma idioma, String negocio) {
        return switch (o(idioma)) {
            case EN -> "Done, we will not send you reminders or promotions from " + negocio
                + ". If you write to us, we will keep answering your questions. To receive them again, send ACTIVAR.";
            case PT -> "Pronto, nao vamos enviar lembretes nem promocoes de " + negocio
                + ". Se voce nos escrever, continuamos respondendo. Para voltar a receber, envie ACTIVAR.";
            case ES -> "Listo, no te vamos a enviar recordatorios ni promociones de " + negocio
                + ". Si nos escribís, te seguimos respondiendo lo que preguntés. "
                + "Si querés volver a recibirlos, escribí ACTIVAR.";
        };
    }

    public static String activar(Idioma idioma, String negocio) {
        return switch (o(idioma)) {
            case EN -> "Done, you will receive reminders from " + negocio
                + " about what you asked. Send STOP whenever you want to stop receiving them.";
            case PT -> "Pronto, voce voltara a receber lembretes de " + negocio
                + " sobre o que consultou. Envie STOP quando quiser parar de receber.";
            case ES -> "Listo, vas a volver a recibir recordatorios de " + negocio
                + " sobre lo que consultaste. Escribí STOP cuando quieras dejar de recibirlos.";
        };
    }

    /** Aviso de comprobante emitido, SIN enlace: hoy no existe una descarga segura para el comprador. */
    public static String comprobante(Idioma idioma, String numeroPedido) {
        return switch (o(idioma)) {
            case EN -> "Your electronic receipt for order " + numeroPedido + " has been issued. "
                + "If you need a copy, reply here and we will help you get it.";
            case PT -> "Seu comprovante eletronico do pedido " + numeroPedido + " foi emitido. "
                + "Se precisar de uma copia, responda aqui e ajudamos voce.";
            case ES -> "Tu comprobante electrónico del pedido " + numeroPedido + " ya fue emitido. "
                + "Si necesitas una copia, responde por aquí y te ayudamos a conseguirla.";
        };
    }

    // ── Notas de voz (respaldos cuando no se puede transcribir) ──────────────────────────────────────────────────
    // BORRADOR EN/PT: revisar el dueño. Español conserva el texto de siempre (trato de usted).

    /** Sin proveedor de transcripción: se pide que escriban el mensaje. */
    public static String vozDeshabilitada(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "I can't listen to voice notes right now. Could you type your message? I'm happy to help!";
            case PT -> "No momento não consigo ouvir áudios. Pode escrever sua mensagem? Será um prazer ajudar!";
            case ES -> "Por ahora no puedo escuchar notas de voz. ¿Me lo podría escribir? Con gusto le ayudo.";
        };
    }

    /** Fallo de descarga, proveedor o audio vacío. */
    public static String vozFallo(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "I couldn't understand your voice note. Could you type your message, please?";
            case PT -> "Não consegui entender seu áudio. Pode escrever sua mensagem, por favor?";
            case ES -> "No logré entender su nota de voz. ¿Me podría escribir su mensaje, por favor?";
        };
    }

    /** Audio sobre el límite de tamaño o duración. */
    public static String vozLarga(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "Your voice note is too long for me to process. Could you type the main points, please?";
            case PT -> "Seu áudio é muito longo para eu processar. Pode escrever o principal, por favor?";
            case ES -> "Su nota de voz es muy larga para procesarla. ¿Me podría escribir lo principal, por favor?";
        };
    }
}
