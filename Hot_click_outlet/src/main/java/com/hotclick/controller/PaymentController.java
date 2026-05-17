package com.hotclick.controller;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    /**
     * Crea un pedido PENDIENTE y una sesión de pago con el proveedor elegido
     * (PAYXPERT o PAYPAL). Devuelve la redirectUrl al proveedor externo.
     */
    @PostMapping("/checkout")
    public ResponseEntity<ResponseDTO> checkout(@RequestBody PaymentCheckoutRequest request) {
        try {
            String correoUsuario = SecurityContextHolder.getContext().getAuthentication().getName();
            PaymentCheckoutResponse response = paymentService.checkout(request, correoUsuario);
            return ResponseEntity.ok(ResponseDTO.success("Sesión de pago creada", response));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /**
     * Consulta el estado de pago de un pedido por número de pedido.
     * El frontend lo llama al regresar de la página del proveedor.
     */
    @GetMapping("/status/{numeroPedido}")
    public ResponseEntity<ResponseDTO> consultarEstado(@PathVariable String numeroPedido) {
        try {
            PaymentStatusResponse response = paymentService.consultarEstado(numeroPedido);
            return ResponseEntity.ok(ResponseDTO.success("Estado del pago", response));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        }
    }

    /**
     * Captura un pago PayPal tras el redirect de aprobación.
     * PayPal redirige con ?token={paypalOrderId}&PayerID={payerId} en la URL de retorno.
     * El frontend llama este endpoint antes de mostrar la pantalla de éxito.
     */
    @PostMapping("/paypal/capture")
    public ResponseEntity<ResponseDTO> capturarPayPal(
            @RequestParam String paypalOrderId,
            @RequestParam String numeroPedido) {
        try {
            String correoUsuario = SecurityContextHolder.getContext().getAuthentication().getName();
            PaymentStatusResponse response = paymentService.capturarPayPal(paypalOrderId, numeroPedido, correoUsuario);
            return ResponseEntity.ok(ResponseDTO.success("Pago capturado exitosamente", response));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
