package com.hotclick.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.CotizacionRequestDTO;
import com.hotclick.model.Cotizacion;
import com.hotclick.repository.CotizacionRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class CotizacionService {

    @Autowired private CotizacionRepository cotizacionRepository;
    @Autowired private ObjectMapper objectMapper;

    @Transactional
    public Cotizacion crearCotizacion(CotizacionRequestDTO dto) {
        if (dto.getTelefono() == null || dto.getTelefono().isBlank())
            throw new RuntimeException("El teléfono es obligatorio");
        if (dto.getItems() == null || dto.getItems().isEmpty())
            throw new RuntimeException("Debe agregar al menos un producto");

        int total = dto.getItems().stream()
            .mapToInt(i -> (i.getPrecio() != null ? i.getPrecio() : 0) * (i.getCantidad() != null ? i.getCantidad() : 1))
            .sum();

        String productosJson;
        try {
            productosJson = objectMapper.writeValueAsString(dto.getItems());
        } catch (Exception e) {
            throw new RuntimeException("Error al procesar productos");
        }

        String mensaje = generarMensajeWhatsApp(dto);

        Cotizacion c = new Cotizacion();
        c.setNombreCliente(dto.getNombreCliente());
        c.setTelefono(limpiarTelefono(dto.getTelefono()));
        c.setProductosJson(productosJson);
        c.setTotal(total);
        c.setMensajeEnviado(mensaje);
        c.setFechaCotizacion(LocalDateTime.now());
        c.setEstado(Constants.ESTADO_ACTIVO);

        return cotizacionRepository.save(c);
    }

    public List<Cotizacion> listarCotizaciones() {
        return cotizacionRepository.findByEstadoOrderByFechaCotizacionDesc(Constants.ESTADO_ACTIVO);
    }

    public String generarMensajeWhatsApp(CotizacionRequestDTO dto) {
        StringBuilder sb = new StringBuilder();
        sb.append("*Cotización HOTCLICK*\n\n");
        if (dto.getNombreCliente() != null && !dto.getNombreCliente().isBlank())
            sb.append("Cliente: ").append(dto.getNombreCliente()).append("\n\n");
        sb.append("*Productos:*\n");
        int total = 0;
        for (CotizacionRequestDTO.ItemDTO item : dto.getItems()) {
            int precio = item.getPrecio() != null ? item.getPrecio() : 0;
            int cant   = item.getCantidad() != null ? item.getCantidad() : 1;
            int sub    = precio * cant;
            total += sub;
            sb.append("• ").append(item.getNombre())
              .append(" x").append(cant)
              .append(" = ₡").append(String.format("%,d", sub)).append("\n");
        }
        sb.append("\n*Total: ₡").append(String.format("%,d", total)).append("*\n\n");
        sb.append("¡Gracias por elegir HOTCLICK! 🚀");
        return sb.toString();
    }

    private String limpiarTelefono(String tel) {
        return tel.replaceAll("[^0-9+]", "");
    }
}
