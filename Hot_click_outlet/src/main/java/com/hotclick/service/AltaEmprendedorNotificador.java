package com.hotclick.service;

import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.dto.ResultadoAltaCupo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AltaEmprendedorNotificador {

    private static final Logger log = LoggerFactory.getLogger(AltaEmprendedorNotificador.class);

    private final TelegramService telegramService;
    private final NotificacionEmailService notificacionEmailService;

    public AltaEmprendedorNotificador(TelegramService telegramService,
                                      NotificacionEmailService notificacionEmailService) {
        this.telegramService = telegramService;
        this.notificacionEmailService = notificacionEmailService;
    }

    @Async
    public void notificar(String nombreEmpresa, String correo, ResultadoAltaCupo resultado) {
        String texto = armarTexto(nombreEmpresa, correo, resultado);
        try {
            telegramService.enviar(texto);
        } catch (Exception ex) {
            log.error("[alta-emprendedor] fallo Telegram — {}", ex.getMessage());
        }
        try {
            notificacionEmailService.enviarAltaEmprendedorAAdminIT(
                nombreEmpresa, correo, resultado.cupoGratis(), resultado.estado());
        } catch (Exception ex) {
            log.error("[alta-emprendedor] fallo email admin — {}", ex.getMessage());
        }
    }

    static String armarTexto(String nombreEmpresa, String correo, ResultadoAltaCupo resultado) {
        CupoEmprendedorEstado estado = resultado.estado();
        StringBuilder sb = new StringBuilder();
        sb.append("Nueva alta de emprendimiento\n");
        sb.append("Negocio: ").append(sanitizar(nombreEmpresa)).append('\n');
        sb.append("Correo: ").append(sanitizar(correo)).append('\n');
        sb.append("Cupos: ").append(estado.usados()).append('/').append(estado.limite()).append('\n');
        if (resultado.demo()) {
            sb.append("Demo QA: no consumió cupo.");
        } else if (resultado.cupoGratis()) {
            sb.append(textoCruce(estado));
        } else {
            sb.append("Sin cupo gratis. Requiere membresía PYME o Negocio Plus.");
        }
        return sb.toString();
    }

    private static String textoCruce(CupoEmprendedorEstado estado) {
        if (estado.usados() >= estado.limite()) {
            return "Se ocupó el último cupo gratis. A partir de ahora la membresía tiene costo.";
        }
        return "Entró con cupo gratis. Quedan " + estado.cuposGratisDisponibles() + ".";
    }

    private static String sanitizar(String valor) {
        if (valor == null) return "";
        return valor.replace('_', ' ').replace('*', ' ').replace('[', ' ');
    }
}
