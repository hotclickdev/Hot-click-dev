package com.hotclick.dto;

/**
 * Snapshot first/last touch + cookies Meta (_fbp/_fbc) para CAPI.
 */
public class AtribucionSnapshotDTO {

    private AtribucionTouchDTO first;
    private AtribucionTouchDTO last;
    private String fbp;
    private String fbc;

    public AtribucionTouchDTO getFirst() { return first; }
    public void setFirst(AtribucionTouchDTO first) { this.first = first; }

    public AtribucionTouchDTO getLast() { return last; }
    public void setLast(AtribucionTouchDTO last) { this.last = last; }

    public String getFbp() { return fbp; }
    public void setFbp(String fbp) { this.fbp = fbp; }

    public String getFbc() { return fbc; }
    public void setFbc(String fbc) { this.fbc = fbc; }
}
