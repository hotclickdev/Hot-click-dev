package com.hotclick.agente.idioma;

import java.util.List;

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
            case PT -> "Obrigado por nos escrever. Uma pessoa da equipe vai continuar com você em breve.";
            case ES -> usted
                ? "Gracias por escribirnos. Para ayudarle mejor, le paso con una persona del equipo, que le responderá en breve."
                : "Gracias por escribirnos. Para ayudarte mejor, te paso con una persona del equipo, que te responderá en breve.";
        };
    }

    public static String moderacion(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "I can only help with questions about the business and its products.";
            case PT -> "Só posso ajudar com perguntas sobre o negócio e seus produtos.";
            case ES -> "Solo puedo ayudar con consultas sobre el negocio y sus productos.";
        };
    }

    public static String baja(Idioma idioma, String negocio) {
        return switch (o(idioma)) {
            case EN -> "Done, we will not send you reminders or promotions from " + negocio
                + ". If you write to us, we will keep answering your questions. To receive them again, send ACTIVAR.";
            case PT -> "Pronto, não vamos enviar lembretes nem promoções de " + negocio
                + ". Se você nos escrever, continuamos respondendo. Para voltar a receber, envie ACTIVAR.";
            case ES -> "Listo, no te vamos a enviar recordatorios ni promociones de " + negocio
                + ". Si nos escribís, te seguimos respondiendo lo que preguntés. "
                + "Si querés volver a recibirlos, escribí ACTIVAR.";
        };
    }

    public static String activar(Idioma idioma, String negocio) {
        return switch (o(idioma)) {
            case EN -> "Done, you will receive reminders from " + negocio
                + " about what you asked. Send STOP whenever you want to stop receiving them.";
            case PT -> "Pronto, você voltará a receber lembretes de " + negocio
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
            case PT -> "Seu comprovante eletrônico do pedido " + numeroPedido + " foi emitido. "
                + "Se precisar de uma cópia, responda aqui e ajudamos você.";
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

    // ── Encuesta de satisfacción al cerrar la conversación ───────────────────────────────────────────────────────
    // BORRADOR EN/PT: revisar el dueño.

    public static String encuestaPregunta(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "Thanks for writing to us. How would you rate the service you received?";
            case PT -> "Obrigado por nos escrever. Como você avalia o atendimento que recebeu?";
            case ES -> "Gracias por escribirnos. ¿Cómo calificas la atención que recibiste?";
        };
    }

    /** Texto del botón que abre la lista (WhatsApp: máx. 20 caracteres). */
    public static String encuestaBoton(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "Rate us";
            case PT -> "Avaliar";
            case ES -> "Calificar";
        };
    }

    public static String encuestaGracias(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "Thanks for your feedback!";
            case PT -> "Obrigado pela sua opinião!";
            case ES -> "¡Gracias por tu opinión!";
        };
    }

    public static String encuestaGraciasNotaBaja(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "Thanks for telling us. We're sorry it wasn't a good experience, and we will look into it.";
            case PT -> "Obrigado por nos contar. Sentimos muito que não tenha sido uma boa experiência e vamos analisar.";
            case ES -> "Gracias por contarnos. Lamentamos que no haya sido una buena experiencia y lo vamos a revisar.";
        };
    }

    /** Las cinco notas de la lista, de 1 a 5 (WhatsApp: título de fila máx. 24 caracteres). */
    public static List<String> encuestaTitulos(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> List.of("1 - Very bad", "2 - Bad", "3 - Okay", "4 - Good", "5 - Excellent");
            case PT -> List.of("1 - Muito ruim", "2 - Ruim", "3 - Regular", "4 - Bom", "5 - Excelente");
            case ES -> List.of("1 - Muy mala", "2 - Mala", "3 - Regular", "4 - Buena", "5 - Excelente");
        };
    }

    // ── Opt-in de ofertas (consentimiento de campañas) ───────────────────────────────────────────────────────────
    // BORRADOR EN/PT: revisar el dueño. El texto de ES sigue pendiente de aprobación legal (AG-15).

    public static String ofertaPregunta(Idioma idioma, String negocio) {
        return switch (o(idioma)) {
            case EN -> "Would you like to receive offers and news from " + negocio + " in this chat? "
                + "You can stop them anytime by sending STOP.";
            case PT -> "Quer receber ofertas e novidades de " + negocio + " neste chat? "
                + "Você pode parar de receber quando quiser enviando STOP.";
            case ES -> "¿Querés recibir ofertas y novedades de " + negocio + " por este chat? "
                + "Podés dejar de recibirlas cuando quieras escribiendo STOP.";
        };
    }

    /** Título del botón de aceptar (WhatsApp: máx. 20 caracteres). */
    public static String ofertaBotonSi(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "Yes, send offers";
            case PT -> "Sim, quero ofertas";
            case ES -> "Sí, quiero ofertas";
        };
    }

    /** Título del botón de rechazar (WhatsApp: máx. 20 caracteres). */
    public static String ofertaBotonNo(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "No, thanks";
            case PT -> "Não, obrigado";
            case ES -> "No, gracias";
        };
    }

    public static String ofertaAceptada(Idioma idioma, String negocio) {
        return switch (o(idioma)) {
            case EN -> "Done, you will receive offers from " + negocio + " in this chat. "
                + "Send STOP whenever you want to stop receiving them.";
            case PT -> "Pronto, você vai receber ofertas de " + negocio + " neste chat. "
                + "Envie STOP quando quiser parar de receber.";
            case ES -> "Listo, vas a recibir ofertas de " + negocio
                + " por este chat. Escribí STOP cuando quieras dejar de recibirlas.";
        };
    }

    public static String ofertaRechazada(Idioma idioma, String negocio) {
        return switch (o(idioma)) {
            case EN -> "Done, we will not send you offers from " + negocio + ".";
            case PT -> "Pronto, não vamos enviar ofertas de " + negocio + ".";
            case ES -> "Listo, no te vamos a enviar ofertas de " + negocio + ".";
        };
    }

    /** El cliente aceptó el opt-in pero está de baja: STOP gana, hay que escribir ACTIVAR. */
    public static String ofertaDeBaja(Idioma idioma, String negocio) {
        return switch (o(idioma)) {
            case EN -> "To receive messages from " + negocio + " again, send ACTIVAR.";
            case PT -> "Para voltar a receber mensagens de " + negocio + ", envie ACTIVAR.";
            case ES -> "Para volver a recibir mensajes de " + negocio + " escribí ACTIVAR.";
        };
    }

    // ── Botones de canal y respaldo en texto ─────────────────────────────────────────────────────────────────────
    // BORRADOR EN/PT: revisar el dueño. Títulos de botón de WhatsApp: máx. 20 caracteres.

    public static String botonComprar(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "Buy";
            case PT, ES -> "Comprar";
        };
    }

    public static String botonVerMas(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "See more";
            case PT -> "Ver mais";
            case ES -> "Ver más";
        };
    }

    public static String botonHablarConPersona(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "Talk to a person";
            case PT -> "Falar com alguém";
            case ES -> "Hablar con persona";
        };
    }

    /** Encabezado de la lista numerada cuando el canal no admite botones. */
    public static String responderConNumero(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "Reply with the number:";
            case PT -> "Responda com o número:";
            case ES -> "Responde con el número:";
        };
    }

    /** Etiqueta de la foto en el respaldo de texto de una tarjeta de producto. */
    public static String foto(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "Photo:";
            case PT, ES -> "Foto:";
        };
    }

    /** Encabezado de la lista de productos del catálogo de Meta (WhatsApp: máx. 60 caracteres). */
    public static String productosTitulo(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "Products for you";
            case PT -> "Produtos para você";
            case ES -> "Productos para vos";
        };
    }

    public static String productosCuerpo(Idioma idioma) {
        return switch (o(idioma)) {
            case EN -> "These options might work for you";
            case PT -> "Estas opções podem servir para você";
            case ES -> "Estas opciones pueden servirte";
        };
    }
}
