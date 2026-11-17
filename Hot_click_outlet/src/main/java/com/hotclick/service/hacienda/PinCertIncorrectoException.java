package com.hotclick.service.hacienda;

/** El PIN no abre el .p12. Mensaje fijo: nunca incluye el PIN. Cuenta como intento fallido (fuerza bruta). */
public class PinCertIncorrectoException extends HaciendaConfiguracionException {
    public PinCertIncorrectoException() {
        super("No pudimos abrir el certificado .p12. Revisá que el PIN sea el correcto.");
    }
}
