package com.hotclick.agente.interno;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.conversacion.spi.InterceptorMensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Decide, antes de guardar el mensaje, si lo consume el modo interno: (1) código de vinculación
 * ("VINCULAR XXXXXXXX", o el código solo si existe uno vigente en ese negocio); (2) "SÍ"/"NO" a una propuesta
 * pendiente; (3) PIN mientras hay una espera de PIN. Lo consumido no se guarda en el historial ni llega a Claude.
 * Cualquier otro mensaje de quien tenía algo pendiente cancela la espera y sigue su camino normal.
 */
@Component
public class InterceptorInterno implements InterceptorMensajeEntrante {

    private static final Pattern CODIGO = Pattern.compile("^(?:VINCULAR\\s+)?([A-Z0-9]{8})$");
    private static final Pattern PIN = Pattern.compile("^\\d{4,6}$");
    private static final Set<String> SI = Set.of("si", "confirmo", "confirmar", "dale");
    private static final Set<String> NO = Set.of("no", "cancelar", "cancelo");

    private final VinculacionInternaService vinculaciones;
    private final ProcesadorInterno procesador;

    public InterceptorInterno(VinculacionInternaService vinculaciones, ProcesadorInterno procesador) {
        this.vinculaciones = vinculaciones;
        this.procesador = procesador;
    }

    @Override
    public boolean interceptar(CanalCuenta cuenta, MensajeEntrante m) {
        if (cuenta.getTipo() != MensajeEntrante.Canal.WHATSAPP || cuenta.getEmpresaId() == null
                || m.texto() == null || m.texto().isBlank()) return false;
        Long empresaId = cuenta.getEmpresaId();
        String texto = m.texto().trim();

        Matcher mc = CODIGO.matcher(texto.toUpperCase(Locale.ROOT));
        if (mc.matches()) {
            String codigo = mc.group(1);
            boolean explicito = texto.toUpperCase(Locale.ROOT).startsWith("VINCULAR");
            if (explicito || vinculaciones.existeCodigoVigente(empresaId, codigo)) {
                procesador.activar(cuenta, m.remitenteId(), codigo);
                return true;
            }
        }

        Optional<AgenteVinculacion> opt = vinculaciones.vinculacionActiva(empresaId, m.remitenteId());
        if (opt.isEmpty() || opt.get().getPendienteTipo() == null) return false;
        AgenteVinculacion v = opt.get();
        if (!v.pendienteVigente(vinculaciones.ahora())) {
            vinculaciones.limpiarPendiente(v.getId());
            return false;
        }
        if (AgenteVinculacion.PEND_CONFIRMAR.equals(v.getPendienteTipo())) {
            String n = normalizar(texto);
            if (SI.contains(n)) { procesador.confirmar(cuenta, m.remitenteId()); return true; }
            if (NO.contains(n)) { procesador.cancelar(cuenta, m.remitenteId()); return true; }
        } else if (PIN.matcher(texto).matches()) {
            procesador.pin(cuenta, m.remitenteId(), texto);
            return true;
        }
        vinculaciones.limpiarPendiente(v.getId()); // otro tema: se abandona la espera
        return false;
    }

    static String normalizar(String s) {
        String sinTildes = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sinTildes.toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "");
    }
}
