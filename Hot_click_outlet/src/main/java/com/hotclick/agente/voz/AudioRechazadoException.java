package com.hotclick.agente.voz;

/** El audio no se descargó por una regla de seguridad o de límite (sin datos del cliente en el mensaje). */
public class AudioRechazadoException extends RuntimeException {

    public enum Motivo { URL_NO_PERMITIDA, TIPO_NO_PERMITIDO, DEMASIADO_GRANDE, SIN_TOKEN, SIN_MEDIA, DESCARGA_FALLIDA }

    private final transient Motivo motivo;

    public AudioRechazadoException(Motivo motivo) {
        super(motivo.name());
        this.motivo = motivo;
    }

    public Motivo motivo() {
        return motivo;
    }
}
