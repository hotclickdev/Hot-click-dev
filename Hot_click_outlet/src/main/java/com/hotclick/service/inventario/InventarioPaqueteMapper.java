package com.hotclick.service.inventario;

import com.hotclick.dto.inventario.PaqueteInventarioDTO;
import com.hotclick.dto.inventario.PaqueteLineaDTO;
import com.hotclick.model.PaqueteInventario;
import com.hotclick.model.PaqueteLinea;
import com.hotclick.utils.BarcodeNormalizer;

import java.util.List;

final class InventarioPaqueteMapper {

    private InventarioPaqueteMapper() {}

    static PaqueteInventarioDTO toSummary(PaqueteInventario p, int totalLineas) {
        PaqueteInventarioDTO dto = base(p);
        dto.setTotalLineas(totalLineas);
        return dto;
    }

    static PaqueteInventarioDTO toDetail(PaqueteInventario p) {
        PaqueteInventarioDTO dto = base(p);
        List<PaqueteLineaDTO> lineas = p.getLineas().stream().map(PaqueteLineaDTO::from).toList();
        dto.setLineas(lineas);
        dto.setTotalLineas(lineas.size());
        return dto;
    }

    private static PaqueteInventarioDTO base(PaqueteInventario p) {
        PaqueteInventarioDTO dto = new PaqueteInventarioDTO();
        dto.setId(p.getId());
        dto.setCodigo(p.getCodigo());
        dto.setEmpresaId(p.getEmpresaId());
        if (p.getEmpresa() != null) {
            dto.setEmpresaNombre(p.getEmpresa().getNombreEmpresa());
        }
        dto.setNombreNegocioTemporal(p.getNombreNegocioTemporal());
        dto.setEstado(p.getEstado());
        dto.setNotas(p.getNotas());
        if (p.getCreadoPor() != null) {
            dto.setCreadoPorNombre(p.getCreadoPor().getNombre());
        }
        dto.setFechaCreacion(p.getFechaCreacion());
        dto.setFechaCierre(p.getFechaCierre());
        dto.setFechaAsignacion(p.getFechaAsignacion());
        return dto;
    }

    static void aplicarRequest(PaqueteLinea linea,
                               com.hotclick.dto.inventario.PaqueteLineaRequest req,
                               com.hotclick.utils.InputSanitizer sanitizer) {
        linea.setBarcode(BarcodeNormalizer.normalize(sanitizer.cleanWithLimit(req.getBarcode(), 50)));
        linea.setSku(blankToNull(sanitizer.cleanWithLimit(req.getSku(), 50)));
        linea.setNombre(sanitizer.cleanWithLimit(req.getNombre(), 200));
        linea.setPrecioCompra(req.getPrecioCompra() != null ? req.getPrecioCompra() : 0);
        linea.setPrecioVenta(req.getPrecioVenta() != null ? req.getPrecioVenta() : 1);
        linea.setStock(req.getStock() != null ? req.getStock() : 0);
        linea.setMarcaTexto(blankToNull(sanitizer.cleanWithLimit(req.getMarcaTexto(), 100)));
        linea.setCategoriaTexto(blankToNull(sanitizer.cleanWithLimit(req.getCategoriaTexto(), 100)));
        linea.setImagenUrl(blankToNull(sanitizer.cleanWithLimit(req.getImagenUrl(), 500)));
        if (req.getEstado() != null && !req.getEstado().isBlank()) {
            linea.setEstado(req.getEstado().trim().toUpperCase());
        }
        if (req.getNotasConflicto() != null) {
            linea.setNotasConflicto(sanitizer.cleanWithLimit(req.getNotasConflicto(), 2000));
        }
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v;
    }
}
