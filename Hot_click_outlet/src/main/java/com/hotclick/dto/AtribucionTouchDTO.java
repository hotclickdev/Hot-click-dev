package com.hotclick.dto;

/**
 * Toque de atribución (UTM + click ids) enviado desde el checkout.
 */
public class AtribucionTouchDTO {

    private String utmSource;
    private String utmMedium;
    private String utmCampaign;
    private String utmContent;
    private String utmTerm;
    private String fbclid;
    private String gclid;
    private String landingPath;
    private String touchedAt;

    public String getUtmSource() { return utmSource; }
    public void setUtmSource(String utmSource) { this.utmSource = utmSource; }

    public String getUtmMedium() { return utmMedium; }
    public void setUtmMedium(String utmMedium) { this.utmMedium = utmMedium; }

    public String getUtmCampaign() { return utmCampaign; }
    public void setUtmCampaign(String utmCampaign) { this.utmCampaign = utmCampaign; }

    public String getUtmContent() { return utmContent; }
    public void setUtmContent(String utmContent) { this.utmContent = utmContent; }

    public String getUtmTerm() { return utmTerm; }
    public void setUtmTerm(String utmTerm) { this.utmTerm = utmTerm; }

    public String getFbclid() { return fbclid; }
    public void setFbclid(String fbclid) { this.fbclid = fbclid; }

    public String getGclid() { return gclid; }
    public void setGclid(String gclid) { this.gclid = gclid; }

    public String getLandingPath() { return landingPath; }
    public void setLandingPath(String landingPath) { this.landingPath = landingPath; }

    public String getTouchedAt() { return touchedAt; }
    public void setTouchedAt(String touchedAt) { this.touchedAt = touchedAt; }
}
