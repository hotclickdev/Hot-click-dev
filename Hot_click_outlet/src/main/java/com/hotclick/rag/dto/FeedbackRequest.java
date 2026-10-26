package com.hotclick.rag.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class FeedbackRequest {

    @NotBlank
    @Size(max = 80)
    private String sesionId;

    @Min(0)
    private int msgIndex;

    @Min(-1) @Max(1)
    private int rating;

    /** Opcional (ALTO-1): si viene, el token debe pertenecer a esta tienda. */
    @Size(max = 120)
    private String empresaSlug;

    public String getEmpresaSlug()        { return empresaSlug; }
    public void   setEmpresaSlug(String s){ this.empresaSlug = s; }

    public String getSesionId()        { return sesionId; }
    public void   setSesionId(String s){ this.sesionId = s; }

    public int getMsgIndex()           { return msgIndex; }
    public void setMsgIndex(int i)     { this.msgIndex = i; }

    public int getRating()             { return rating; }
    public void setRating(int r)       { this.rating = r; }
}
