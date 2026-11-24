package com.hotclick.agente.motor;

import com.hotclick.service.copilot.AiCopilotToolExecutor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Registro de herramientas del motor. Reúne los beans {@link HerramientaAgente} y las herramientas de
 * consulta del copilot (adaptadas, sin duplicarlas) y las expone filtradas por perfil: solo las de la lista
 * cerrada de {@link PerfilAgente#herramientas()} que además estén {@link HerramientaAgente#disponible()}.
 */
@Component
public class RegistroHerramientas {

    private final Map<String, HerramientaAgente> porNombre = new LinkedHashMap<>();

    public RegistroHerramientas(List<HerramientaAgente> herramientas, AiCopilotToolExecutor copilot) {
        for (HerramientaAgente h : herramientas) {
            registrar(h);
        }
        // Solo lectura: puedeGestionar=false y esDueno=false => sin proponer_* ni finanzas.
        for (Map<String, Object> def : copilot.buildTools(null, false, false)) {
            registrar(new CopilotHerramienta(def, copilot));
        }
    }

    private void registrar(HerramientaAgente nueva) {
        HerramientaAgente previa = porNombre.get(nueva.nombre());
        // Un stub nunca reemplaza a una implementación disponible; una real reemplaza al stub.
        if (previa == null || (!previa.disponible() && nueva.disponible())) {
            porNombre.put(nueva.nombre(), nueva);
        }
    }

    /** Herramientas que el perfil puede ver, en orden estable por nombre (mantiene el prefijo cacheable). */
    public List<HerramientaAgente> paraPerfil(PerfilAgente perfil) {
        return porNombre.values().stream()
            .filter(HerramientaAgente::disponible)
            .filter(h -> perfil.permite(h.nombre()))
            .sorted(Comparator.comparing(HerramientaAgente::nombre))
            .toList();
    }

    /** Herramienta ejecutable por el perfil, o vacío si no existe, no está disponible o no le corresponde. */
    public Optional<HerramientaAgente> permitida(PerfilAgente perfil, String nombre) {
        if (nombre == null || !perfil.permite(nombre)) return Optional.empty();
        return Optional.ofNullable(porNombre.get(nombre)).filter(HerramientaAgente::disponible);
    }
}
