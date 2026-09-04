package com.hotclick.service;



import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import com.hotclick.dto.CupoEmprendedorEstado;

import com.hotclick.model.Pedido;

import com.hotclick.service.email.NotificacionNegocioEmailSender;

import com.hotclick.service.email.NotificacionPedidoEmailSender;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.scheduling.annotation.Async;

import org.springframework.stereotype.Service;



/**

 * Fachada de emails transaccionales HotClick (Brand Book v1.1).

 * Delega construcción HTML a {@link com.hotclick.service.email} y envío a Resend/WhatsApp.

 */

@Service

public class NotificacionEmailService {



    @Autowired private NotificacionPedidoEmailSender pedidoEmailSender;

    @Autowired private NotificacionNegocioEmailSender negocioEmailSender;



    @Value("${adminit.email:}")

    private String adminItEmail;



    @Value("${adminit.telefono:}")

    private String adminItTelefono;



    @Async

    public void enviarConfirmacionPedido(Pedido pedido) {

        pedidoEmailSender.enviarConfirmacionPedido(pedido, adminItEmail, adminItTelefono);

    }



    @Async

    public void enviarNotificacionGuia(Pedido pedido) {

        pedidoEmailSender.enviarNotificacionGuia(pedido);

    }



    @Async

    public void enviarSeguimientoEstado(Pedido pedido) {

        enviarSeguimientoEstado(pedido, null);

    }



    @Async

    public void enviarSeguimientoEstado(Pedido pedido, String nota) {

        pedidoEmailSender.enviarSeguimientoEstado(pedido, nota);

    }



    /** Versión síncrona — lanza excepción si SendGrid falla (usar desde el endpoint /notificar). */

    public void enviarSeguimientoEstadoSync(Pedido pedido, String nota) {

        pedidoEmailSender.enviarSeguimientoEstadoSync(pedido, nota);

    }



    @Async

    public void enviarRecuperacionCarrito(

            String email, String tokenRecuperacion,

            List<CarritoAbandonadoRequestDTO.CartItemDTO> items,

            String appUrl) {

        pedidoEmailSender.enviarRecuperacionCarrito(email, tokenRecuperacion, items, appUrl);

    }



    @Async

    public void enviarPagoFallido(Pedido pedido, String motivo) {

        pedidoEmailSender.enviarPagoFallido(pedido, motivo);

    }



    @Async

    public void enviarNuevoPedidoAEmprendedor(Pedido pedido) {

        pedidoEmailSender.enviarNuevoPedidoAEmprendedor(pedido);

    }



    @Async

    public void enviarNuevoPedidoAAdminIT(Pedido pedido, String correoAdminIT) {

        pedidoEmailSender.enviarNuevoPedidoAAdminIT(pedido, correoAdminIT);

    }



    @Async

    public void enviarCuponBienvenida(String email, String codigo) {

        negocioEmailSender.enviarCuponBienvenida(email, codigo);

    }



    @Async

    public void enviarBienvenidaEmprendedor(String correo, String nombre, String nombreEmpresa) {

        negocioEmailSender.enviarBienvenidaEmprendedor(correo, nombre, nombreEmpresa);

    }



    @Async

    public void enviarAprobacionNegocio(String correo, String nombre, String nombreEmpresa) {

        negocioEmailSender.enviarAprobacionNegocio(correo, nombre, nombreEmpresa);

    }



    @Async

    public void enviarRechazoNegocio(String correo, String nombre, String nombreEmpresa) {
        enviarRechazoNegocio(correo, nombre, nombreEmpresa, null);
    }

    public void enviarRechazoNegocio(String correo, String nombre, String nombreEmpresa, String motivo) {
        negocioEmailSender.enviarRechazoNegocio(correo, nombre, nombreEmpresa, motivo);
    }



    /**

     * Enviada al nuevo miembro cuando el emprendedor lo agrega al equipo.

     * Si passwordPlano != null es un usuario nuevo y se incluyen las credenciales.

     * Si passwordPlano == null es un usuario existente que se suma a otro negocio.

     */

    @Async

    public void enviarInvitacionMiembro(String correo, String nombre, String rolEnEmpresa,

                                        String nombreEmpresa, String passwordPlano) {

        negocioEmailSender.enviarInvitacionMiembro(correo, nombre, rolEnEmpresa, nombreEmpresa, passwordPlano);

    }



    @Async

    public void enviarAltaEmprendedorAAdminIT(String nombreEmpresa, String correo,

                                              boolean cupoGratis, CupoEmprendedorEstado estado) {

        if (adminItEmail == null || adminItEmail.isBlank()) return;

        negocioEmailSender.enviarAltaEmprendedorAdmin(adminItEmail, nombreEmpresa, correo, cupoGratis, estado);

    }

}

