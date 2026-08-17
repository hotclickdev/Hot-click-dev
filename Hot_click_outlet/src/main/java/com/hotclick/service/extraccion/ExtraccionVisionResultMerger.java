package com.hotclick.service.extraccion;

import com.hotclick.service.GoogleVisionService;
import com.hotclick.service.GoogleVisionService.VisionResult;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
class ExtraccionVisionResultMerger {

    VisionResult fusionarVisionResults(List<String> imagenesBase64, GoogleVisionService vision) {
        VisionResult merged = null;
        for (String b64 : imagenesBase64) {
            VisionResult r = vision.analizar(b64);
            // OCR en llamada separada para no interferir con WEB_DETECTION
            String ocr = vision.extraerTextoOcr(b64);
            if (!ocr.isBlank()) r.textoOcr = ocr;

            if (merged == null) {
                merged = r;
            } else {
                for (String etiqueta : r.etiquetas)
                    if (!merged.etiquetas.contains(etiqueta)) merged.etiquetas.add(etiqueta);
                for (String url : r.urlsEcommerce)
                    if (!merged.urlsEcommerce.contains(url)) merged.urlsEcommerce.add(url);
                for (GoogleVisionService.WebEntity we : r.webEntities)
                    if (merged.webEntities.stream().noneMatch(e -> e.description.equals(we.description)))
                        merged.webEntities.add(we);
                for (String lf : r.labelsFisicos)
                    if (!merged.labelsFisicos.contains(lf)) merged.labelsFisicos.add(lf);
                if (!r.textoOcr.isBlank()) {
                    merged.textoOcr = merged.textoOcr.isBlank()
                        ? r.textoOcr
                        : merged.textoOcr + "\n---\n" + r.textoOcr;
                }
            }
        }
        return merged != null ? merged : new VisionResult();
    }
}
