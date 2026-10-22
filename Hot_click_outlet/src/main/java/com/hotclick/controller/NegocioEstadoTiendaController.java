package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Pedido de Frontend #182: estado de la tienda para el panel del negocio (pausa de HotClick, plan y
 * pedidos en curso). Montos solo desde el plan guardado; sin valores inventados.
 */
@RestController
@RequestMapping("/api/negocio")
@PreAuthorize("hasRole('EMPRENDEDOR')")
public class NegocioEstadoTiendaController {

    static final java.util.Set<String> EN_CURSO = java.util.Set.of(
        Constants.PEDIDO_PENDIENTE, Constants.PEDIDO_PENDIENTE_COMPROBANTE, Constants.PEDIDO_PENDIENTE_APROBACION,
        Constants.PEDIDO_CONFIRMADO, Constants.PEDIDO_PAGADO, Constants.PEDIDO_PREPARANDO,
        Constants.PEDIDO_EN_PREPARACION, Constants.PEDIDO_LISTO_RETIRO, Constants.PEDIDO_ENVIADO);

    private final CompanyScope companyScope;
    private final EmpresaRepository empresaRepository;
    private final PedidoRepository pedidoRepository;

    public NegocioEstadoTiendaController(CompanyScope companyScope, EmpresaRepository empresaRepository,
                                         PedidoRepository pedidoRepository) {
        this.companyScope = companyScope;
        this.empresaRepository = empresaRepository;
        this.pedidoRepository = pedidoRepository;
    }

    @GetMapping("/estado-tienda")
    @Transactional(readOnly = true)
    public ResponseEntity<ResponseDTO> estadoTienda() {
        Long empresaId = companyScope.requireEmpresaId();
        Empresa e = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Negocio no encontrado"));
        Plan plan = e.getPlan();
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("estado", e.isTiendaPausada() ? "PAUSADA" : "ACTIVA");
        d.put("reactivada", false);
        d.put("plan", plan != null ? plan.getNombre() : e.getPlanSaas());
        d.put("montoMensualidad", plan != null ? plan.getPrecioMensual() : null);
        d.put("diasGracia", null);
        d.put("pedidosEnCurso", pedidoRepository.countByEmpresa_IdAndEstadoPedidoIn(empresaId, EN_CURSO));
        return ResponseEntity.ok(ResponseDTO.success("Estado de la tienda", d));
    }
}
