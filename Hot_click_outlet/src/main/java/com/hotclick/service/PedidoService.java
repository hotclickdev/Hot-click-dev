package com.hotclick.service;

import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class PedidoService {

    @Autowired
    private PedidoRepository pedidoRepository;

    @Transactional
    public Pedido crearPedido(Pedido pedido) {
        pedido.setNumeroPedido("ORD-" + System.currentTimeMillis());
        pedido.setFechaPedido(LocalDateTime.now());
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        return pedidoRepository.save(pedido);
    }

    @Transactional
    public Pedido cambiarEstado(Long id, String nuevoEstado) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
        pedido.setEstadoPedido(nuevoEstado);
        return pedidoRepository.save(pedido);
    }

    public Pedido buscarPorId(Long id) {
        return pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
    }

    public Page<Pedido> listarPorUsuario(Long usuarioId, Pageable pageable) {
        return pedidoRepository.findByUsuarioFinalIdOrderByFechaPedidoDesc(usuarioId, pageable);
    }

    public List<Pedido> listarPendientes() {
        return pedidoRepository.findByEstadoPedidoAndEstado(Constants.PEDIDO_PENDIENTE, Constants.ESTADO_ACTIVO);
    }
}
