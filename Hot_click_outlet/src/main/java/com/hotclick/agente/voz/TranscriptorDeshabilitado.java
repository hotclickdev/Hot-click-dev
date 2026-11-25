package com.hotclick.agente.voz;

import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Component;

/** Sin proveedor configurado: no transcribe; el bot responde pidiendo que escriban el mensaje. */
@Component
@Conditional(SinProveedorVoz.class)
public class TranscriptorDeshabilitado implements TranscriptorVoz {

    @Override
    public boolean habilitado() {
        return false;
    }

    @Override
    public ResultadoVoz transcribir(AudioVoz audio) {
        throw new TranscripcionException("Transcripción deshabilitada");
    }
}
