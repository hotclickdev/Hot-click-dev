package com.hotclick.service.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.service.ImageModerationService;
import com.hotclick.service.TextModerationService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ProductoModerationFacade {

    private final ImageModerationService imageModerationService;
    private final TextModerationService textModerationService;

    public ProductoModerationFacade(ImageModerationService imageModerationService,
                                    TextModerationService textModerationService) {
        this.imageModerationService = imageModerationService;
        this.textModerationService = textModerationService;
    }

    public boolean isTextoPermitido(ProductoRequestDTO dto) {
        var textMod = textModerationService.moderar(
            dto.getNombreProducto(), dto.getDescripcionCorta(),
            dto.getTituloProducto(), dto.getDescripcionLarga(),
            dto.getEspecificaciones(), dto.getComoUsar(), dto.getTags());
        return textMod.safe();
    }

    public ImageModerationService.ModerationResult moderarImagen(MultipartFile file) {
        return imageModerationService.moderar(file);
    }
}
