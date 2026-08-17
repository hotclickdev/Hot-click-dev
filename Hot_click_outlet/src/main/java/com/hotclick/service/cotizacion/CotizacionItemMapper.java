package com.hotclick.service.cotizacion;

import com.hotclick.dto.CotizacionB2BRequestDTO;
import com.hotclick.model.Cotizacion;
import com.hotclick.model.CotizacionItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
public class CotizacionItemMapper {

    @Autowired private ProductoRepository productoRepository;

    public void mapearItems(Cotizacion cotizacion, List<CotizacionB2BRequestDTO.ItemDTO> dtos) {
        List<Long> productoIds = dtos.stream()
            .filter(d -> CotizacionItem.TIPO_CATALOGO.equals(d.getTipo()) && d.getProductoId() != null)
            .map(CotizacionB2BRequestDTO.ItemDTO::getProductoId)
            .toList();

        Map<Long, Producto> productoMap = productoIds.isEmpty()
            ? Collections.emptyMap()
            : productoRepository.findAllById(productoIds).stream()
                .collect(java.util.stream.Collectors.toMap(Producto::getId, p -> p));

        int orden = 0;
        for (CotizacionB2BRequestDTO.ItemDTO dto : dtos) {
            CotizacionItem item = new CotizacionItem();
            item.setCotizacion(cotizacion);
            item.setTipo(dto.getTipo() != null ? dto.getTipo() : CotizacionItem.TIPO_CATALOGO);
            item.setOrden(orden++);
            item.setCantidad(dto.getCantidad() != null ? dto.getCantidad() : 1);
            item.setUnidadMedida(dto.getUnidadMedida() != null ? dto.getUnidadMedida() : "UNIDAD");
            item.setDescuentoPorcentaje(dto.getDescuentoPorcentaje() != null ? dto.getDescuentoPorcentaje() : 0);

            if (CotizacionItem.TIPO_CATALOGO.equals(item.getTipo()) && dto.getProductoId() != null) {
                Producto p = productoMap.get(dto.getProductoId());
                if (p != null) {
                    item.setProducto(p);
                    item.setCodigo(dto.getCodigo() != null ? dto.getCodigo() : p.getSku());
                    item.setNombre(dto.getNombre() != null ? dto.getNombre() : p.getNombreProducto());
                    item.setDescripcion(dto.getDescripcion() != null ? dto.getDescripcion() : p.getDescripcionCorta());
                    item.setImagenUrl(dto.getImagenUrl() != null ? dto.getImagenUrl() : p.getImagenPrincipalUrl());
                    item.setPrecioUnitario(dto.getPrecioUnitario() != null ? dto.getPrecioUnitario() : p.getPrecioVenta());
                } else {
                    poblarItemTemporal(item, dto);
                }
            } else {
                poblarItemTemporal(item, dto);
            }

            int base     = item.getPrecioUnitario() * item.getCantidad();
            int descuento = base * item.getDescuentoPorcentaje() / 100;
            item.setSubtotalLinea(base - descuento);
            cotizacion.getItems().add(item);
        }
    }

    private void poblarItemTemporal(CotizacionItem item, CotizacionB2BRequestDTO.ItemDTO dto) {
        item.setTipo(CotizacionItem.TIPO_TEMPORAL);
        item.setCodigo(dto.getCodigo());
        item.setNombre(dto.getNombre() != null ? dto.getNombre() : "Ítem sin nombre");
        item.setDescripcion(dto.getDescripcion());
        item.setImagenUrl(dto.getImagenUrl());
        item.setPrecioUnitario(dto.getPrecioUnitario() != null ? dto.getPrecioUnitario() : 0);
    }
}
