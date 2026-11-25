package com.hotclick.agente.interno;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.ResendEmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;

/** Envía el aviso por correo al negocio, después de confirmar la transacción (sin I/O con la fila bloqueada). */
@Component
public class AvisoBloqueoPinCorreo implements AvisoBloqueoPin {

    private static final Logger log = LoggerFactory.getLogger(AvisoBloqueoPinCorreo.class);

    private final EmpresaRepository empresas;
    private final ResendEmailService correo;

    public AvisoBloqueoPinCorreo(EmpresaRepository empresas, ResendEmailService correo) {
        this.empresas = empresas;
        this.correo = correo;
    }

    @Override
    public void bloqueoLargo(Long empresaId, Duration duracion) {
        if (empresaId == null) return;
        Runnable envio = () -> enviar(empresaId, duracion);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    envio.run();
                }
            });
        } else {
            envio.run();
        }
    }

    private void enviar(Long empresaId, Duration duracion) {
        try {
            Empresa empresa = empresas.findById(empresaId).orElse(null);
            if (empresa == null || empresa.getCorreoEmpresa() == null) return;
            String tiempo = duracion.toHours() >= 24 ? "24 horas" : duracion.toHours() + " hora(s)";
            correo.send(empresa.getCorreoEmpresa(), "Se bloqueó el PIN del asistente interno de tu negocio",
                "<p>El PIN del modo interno del asistente (consultas de finanzas y acciones por WhatsApp) falló "
                    + "varias veces seguidas y quedó bloqueado por " + tiempo + ". Si no fuiste vos ni tu equipo, "
                    + "revocá la vinculación del teléfono desde el panel y cambiá el PIN.</p>");
        } catch (RuntimeException e) {
            log.warn("[agente-pin] no se pudo enviar el aviso de bloqueo: {}", e.getClass().getSimpleName());
        }
    }
}
