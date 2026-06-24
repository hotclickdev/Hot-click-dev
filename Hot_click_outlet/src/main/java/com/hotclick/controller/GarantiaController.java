package com.hotclick.controller;
nimport com.hotclick.utils.Constants;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/garantias")
public class GarantiaController {

    @Autowired private PedidoRepository pedidoRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private CompanyScope companyScope;

    /**
     * Devuelve los productos comprados por el usuario autenticado que aún tienen
     * garantía activa, junto con los que ya vencieron (últimos 6 meses).
     */
    @GetMapping("/mis-garantias")
    public ResponseEntity<ResponseDTO> misGarantias(
            @AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null)
            return ResponseEntity.status(401).body(ResponseDTO.error("No autenticado"));

        var usuarioOpt = usuarioRepo.findByCorreo(userDetails.getUsername());
        if (usuarioOpt.isEmpty())
            return ResponseEntity.status(404).body(ResponseDTO.error("Usuario no encontrado"));

        Long usuarioId = usuarioOpt.get().getId();
        List<Pedido> pedidos = pedidoRepo.findEntregadosConItemsByUsuarioId(usuarioId);

        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        List<Map<String, Object>> resultado = new ArrayList<>();

        for (Pedido pedido : pedidos) {
            LocalDate fechaEntrega = pedido.getFechaEntregaReal();
            if (fechaEntrega == null) continue;

            for (PedidoItem item : pedido.getItems()) {
                var producto = item.getProducto();
                if (producto == null) continue;

                int garantiaDias = producto.getGarantiaDias();
                if (garantiaDias <= 0) continue;

                LocalDate vencimiento = fechaEntrega.plusDays(garantiaDias);
                long diasRestantes = hoy.until(vencimiento).getDays();

                // Solo incluir si venció hace menos de 180 días o aún está activa
                if (diasRestantes < -180) continue;

                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("productoId", producto.getId());
                entry.put("nombre", producto.getNombreProducto());
                entry.put("imagenUrl", producto.getImagenPrincipalUrl());
                entry.put("garantiaDias", garantiaDias);
                entry.put("fechaEntrega", fechaEntrega.toString());
                entry.put("fechaVencimiento", vencimiento.toString());
                entry.put("diasRestantes", diasRestantes);
                entry.put("activa", diasRestantes >= 0);
                entry.put("numeroPedido", pedido.getNumeroPedido());
                entry.put("pedidoId", pedido.getId());
                resultado.add(entry);
            }
        }

        // Activas primero, luego vencidas recientes
        resultado.sort(Comparator.comparingLong(
            e -> -((Number) e.get("diasRestantes")).longValue()
        ));

        return ResponseEntity.ok(ResponseDTO.success("Garantías obtenidas", resultado));
    }

    /**
     * Garantías de productos vendidos por la empresa del EMPRENDEDOR autenticado.
     * Muestra pedidos entregados de su empresa que tienen productos con garantía.
     */
    @GetMapping("/mis-productos")
    public ResponseEntity<ResponseDTO> garantiasDeEmpresa() {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null)
            return ResponseEntity.status(403).body(ResponseDTO.error("Solo disponible para empresas"));

        List<Pedido> pedidos = pedidoRepo.findEntregadosConItemsByEmpresaId(empresaId);
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        List<Map<String, Object>> resultado = new ArrayList<>();

        for (Pedido pedido : pedidos) {
            LocalDate fechaEntrega = pedido.getFechaEntregaReal();
            if (fechaEntrega == null) continue;

            for (PedidoItem item : pedido.getItems()) {
                var producto = item.getProducto();
                if (producto == null) continue;
                int garantiaDias = producto.getGarantiaDias();
                if (garantiaDias <= 0) continue;

                LocalDate vencimiento = fechaEntrega.plusDays(garantiaDias);
                long diasRestantes = hoy.until(vencimiento).getDays();
                if (diasRestantes < -180) continue;

                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("productoId",      producto.getId());
                entry.put("nombre",          producto.getNombreProducto());
                entry.put("imagenUrl",       producto.getImagenPrincipalUrl());
                entry.put("garantiaDias",    garantiaDias);
                entry.put("fechaEntrega",    fechaEntrega.toString());
                entry.put("fechaVencimiento",vencimiento.toString());
                entry.put("diasRestantes",   diasRestantes);
                entry.put("activa",          diasRestantes >= 0);
                entry.put("numeroPedido",    pedido.getNumeroPedido());
                entry.put("pedidoId",        pedido.getId());
                entry.put("clienteNombre",
                    pedido.getUsuarioFinal() != null ? pedido.getUsuarioFinal().getNombre() : "—");
                resultado.add(entry);
            }
        }

        resultado.sort(Comparator.comparingLong(
            e -> -((Number) e.get("diasRestantes")).longValue()
        ));
        return ResponseEntity.ok(ResponseDTO.success("Garantías de productos", resultado));
    }
}
