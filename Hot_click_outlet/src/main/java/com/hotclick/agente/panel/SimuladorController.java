package com.hotclick.agente.panel;

import com.hotclick.dto.ResponseDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Simulador del bot de ventas del negocio (AG-22). Sin efectos: ver {@link SimuladorService}. */
@RestController
@RequestMapping("/api/agente/simulador")
public class SimuladorController {

    public record Pedido(String mensaje, List<SimuladorService.Turno> historial) {
        @Override
        public String toString() {
            return "Pedido[turnos=" + (historial == null ? 0 : historial.size()) + "]";
        }
    }

    private final SimuladorService service;
    private final PanelAcceso acceso;

    public SimuladorController(SimuladorService service, PanelAcceso acceso) {
        this.service = service;
        this.acceso = acceso;
    }

    @PostMapping
    public ResponseEntity<SimuladorService.Resultado> simular(@RequestBody Pedido body) {
        Long empresaId = acceso.empresa();
        if (body == null) throw new IllegalArgumentException("Escribí un mensaje para probar");
        return ResponseEntity.ok(service.simular(empresaId, acceso.usuarioId(), body.mensaje(), body.historial()));
    }

    @ExceptionHandler(SimuladorService.LimiteSimuladorException.class)
    public ResponseEntity<ResponseDTO> limite(SimuladorService.LimiteSimuladorException e) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).header("Retry-After", "60")
            .body(ResponseDTO.error(e.getMessage()));
    }
}
